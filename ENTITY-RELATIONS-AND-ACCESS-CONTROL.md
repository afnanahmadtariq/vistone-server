# Entity relations, enforcement, and access control

This document describes **all persisted entity relationships** in the Vistone server monorepo (per Prisma/Mongoose schemas), how **IDs link services** that do not share foreign keys, and where **authentication and authorization** are enforced. It reflects the code as of the documentation date.

---

## 1. Architecture snapshot

| Layer | Role |
|--------|------|
| **API Gateway** (`apps/api-gateway`) | Single GraphQL + REST upload entry for browsers; calls downstream HTTP APIs; **primary RBAC enforcement** for GraphQL via `requireAuth`, `requirePermission`, `requireOrganization`, etc. |
| **Auth service** (`apps/auth-service`) | Identity, organizations, memberships, roles (with JSON permissions), invitations, KYC, MFA, activity logs; issues session/auth flows and validates **`/auth/me`** for callers that attach JWTs. |
| **Domain microservices** | Project, workforce, client, knowledge, communication (PG + Mongo messages), notification, monitoring, AI engine—each has its own Prisma schema **schema namespace** in Postgres (or Mongo for chat bodies). |
| **Trust boundary** | **Domain Express microservices** mount **`bearerAuthMiddleware`** from **`@vistone-server/shared-internal-auth`**, which validates **`Authorization: Bearer`** by calling **`POST {AUTH_SERVICE_URL}/auth/me`** (same contract as the gateway’s user context). The **API Gateway** stores the incoming Bearer in **`AsyncLocalStorage`** and **forwards it** on outbound **`backendClient`** requests. Use **`SKIP_INTERNAL_SERVICE_AUTH=true`** only for local/tests; default skips **`/`**, **`/health`**, and **`OPTIONS`**. **Authorization for GraphQL** remains primary at the gateway; AI engine enforces JWT on **`/api/chat`**. For internet-facing workers, still prefer **private networking / mesh** and TLS—JWT reuse is not a substitute for full zero-trust service identity if you require it. |

---

## 2. PostgreSQL schema namespaces (isolation)

Each service targets its own **Postgres schema** (same database URL can hold multiple schemas):

| Postgres schema | Service app | Purpose |
|-----------------|-------------|---------|
| `auth` | auth-service | Users, orgs, memberships, roles, KYC, MFA, activity logs, invitations |
| `project` | project-management | Projects, tasks, milestones, risks, AI insights |
| `workforce` | workforce-management | Teams, team members, user skills, availability |
| `client` | client-management | Clients, project–client links, feedback, proposals |
| `knowledge` | knowledge-hub | Wikis, pages, versions, folders, documents, document permissions |
| `communication` | communication | Chat channels, channel members (messages in **MongoDB**) |
| `notification` | notification | Templates, preferences, notifications |
| `monitoring` | monitoring-reporting | KPIs, reports, dashboards, automation, schedules, etc. |
| `ai_engine` | ai-engine | RAG documents/embeddings, conversation history, RAG access control |

**MongoDB** (`communication`): chat **message** documents (channelId, senderId, content, attachments, …)—referenced logically by PostgreSQL `communication.chat_channels` / `channel_members`.

---

## 3. Auth service (`auth` schema)—identity and RBAC source of truth

### 3.1 Entities and relations

```
Organization (1) ──< (N) OrganizationMember (N) >── (1) User
        │                        │
        │                        └──> (0..1) Role
        └──< (N) Role

User (1) ── (0..1) KycData
User (1) ── (0..1) MfaSetting
User (1) ──< (N) ActivityLog

Invitation — standalone row: email, token, organizationId, expiresAt (no Prisma relation to User until accepted)
```

- **OrganizationMember** is the **join** between **User** and **Organization** and carries **`roleId`** → **Role**.
- **Role** belongs to an **Organization** (`organizationId` nullable for global/system definitions in principle; product uses org-scoped roles with JSON **`permissions`**).
- **ActivityLog** references **User** with **required** **`userId`** (column is NOT NULL); logs are filtered for tenancy via **user → organization memberships** in API usage.
- **User** has no Prisma relation to **Project** / **Team**—those live in other services; linkage is by **same UUID `userId`** string.

### 3.2 Permission model (stored on `Role.permissions` JSON)

- **Resources** (string keys): `users`, `teams`, `projects`, `tasks`, `clients`, `wiki`, `channels`, `settings`, `reports`, `notifications`.
- **Actions** (array per resource): `create`, `read`, `update`, `delete`, `assign` (subset per resource).
- **`_meta`**: meta-permissions `manage_permissions`, `pause_contributors` (delegation rules described in `apps/auth-service/src/lib/roles.ts`).
- **Organizer** name match gets **full bypass** in gateway and AI engine checks (`role?.toLowerCase() === 'organizer'`).
- Default matrices for **Organizer / Manager / Contributor / Client** are defined in code (`ORGANIZER_PERMISSIONS`, etc.); org-specific roles extend/customize via stored JSON.

---

## 4. Project management (`project` schema)

### 4.1 Entities and relations

```
Project (organizationId, clientId?, managerId?, teamIds[])
    │
    ├──< ProjectMember (userId)     … logical FK to auth.users.id (no DB FK)
    ├──< Task (assigneeId?, creatorId?, parentId?)  … self-relation subtasks
    │       ├──< TaskChecklist
    │       ├──  TaskDependency (dependsOnId)
    │       └──  AiInsight (optional)
    ├──< Milestone
    ├──< RiskRegister
    └──  AiInsight
```

- **`organizationId`**: tenancy key (no FK to `auth.organizations` in DB).
- **`clientId`**: logical link to **client.clients.id**.
- **`managerId`**, **`assigneeId`**, **`creatorId`**, **`userId`** on members: all **auth user UUIDs** as strings.
- **`teamIds`**: string array of **workforce.teams.id** values.

---

## 5. Workforce (`workforce` schema)

```
Team (organizationId, managerId?)
    └──< TeamMember (userId)

UserSkill (userId)
UserAvailability (userId)
```

- **`managerId`** / **`userId`**: logical references to **auth users**.
- **`organizationId`**: tenancy.

---

## 6. Client management (`client` schema)

```
Client (organizationId?, contactPersonId?)
    ├──< ProjectClient (projectId, clientId)
    ├──< ClientFeedback (projectId?)
    └──< Proposal
```

- **`projectId`** on **ProjectClient** / feedback: logical reference to **project.projects.id**.
- **`contactPersonId`**: auth **User** id.

---

## 7. Knowledge hub (`knowledge` schema)

```
Wiki (organizationId)
    ├──< WikiPage ──< WikiPageVersion
    ├──< DocumentFolder (parent hierarchy)
    ├──< Document ──< DocumentPermission (userId?, roleId?)
    └──  WikiProjectLink (wikiId unique, projectId unique)  … links wiki ↔ project
```

- **`WikiProjectLink`**: enforces **one wiki per project** and **one project per wiki** at DB level (`@unique` on both sides).
- **DocumentPermission** stores optional **userId** / **roleId** strings (logical links to auth entities).

---

## 8. Communication (`communication` schema + MongoDB)

**PostgreSQL**

```
ChatChannel (organizationId, projectId?, type: project|group|dm, createdBy)
    └──< ChannelMember (userId, role admin|member)  @@unique([channelId, userId])
```

**MongoDB** (mongoose)

- **Message**: `channelId`, `senderId`, content, attachments, mentions (`userId`), reactions (`userId`), …

Cross-links:

- **`projectId`** on channel ↔ **project.projects.id** when `type === "project"`.
- **`createdBy`** / **`userId`** ↔ **auth users**.

---

## 9. Notification (`notification` schema)

```
NotificationTemplate
NotificationPreference (userId, preferences JSON)
Notification (userId, …)
```

- **`userId`** is logical auth user id.

---

## 10. Monitoring & reporting (`monitoring` schema)

```
KpiDefinition ──< KpiMeasurement
ReportTemplate
GeneratedReport
MemberPerformance (userId)
AiConversation (userId?)
AutomationRule / AutomationLog
Dashboard (userId) ──< DashboardWidget
ReportSchedule (organizationId, …)
```

- Mix of global templates and **user-scoped** dashboards; **ReportSchedule** carries **`organizationId`** for tenancy.

---

## 11. AI engine (`ai_engine` schema)

```
RagDocument (organizationId, sourceSchema, sourceTable, sourceId, contentType, …)
    └──< RagEmbedding (vector)

ConversationHistory (organizationId, userId, sessionId, role user|assistant)

RagAccessControl (organizationId?, contentType)  … toggles RAG visibility per type / org

SystemPromptTemplate
```

- **`RagDocument`**: logical pointer to a row in another service (`sourceSchema` / `sourceTable` / `sourceId`) plus **`organizationId`** for isolation.
- **`@@unique([sourceSchema, sourceTable, sourceId])`** prevents duplicate index rows for one entity.
- **ConversationHistory**: chat turns for RAG/agent context, scoped by **organizationId + userId + sessionId**.

---

## 12. Cross-service “relations” (no FK across schemas)

These are **contractual**, not enforced by the database:

| From | Field | To (conceptual) |
|------|--------|-------------------|
| All domain tables | `organizationId` | `auth.organizations.id` |
| Project / Team / Wiki / Channel / … | same pattern | organization tenancy |
| `project.managerId`, task `assigneeId` / `creatorId`, `project_members.userId`, `team_members.userId`, … | UUID | `auth.users.id` |
| `project.clientId` | UUID | `client.clients.id` |
| `project.teamIds[]` | UUIDs | `workforce.teams.id` |
| `client.project_clients.projectId` | UUID | `project.projects.id` |
| `knowledge.wiki_project_links.projectId` | UUID | `project.projects.id` |
| `communication.chat_channels.projectId` | UUID | `project.projects.id` |
| `ai_engine.rag_documents` | `(sourceSchema, sourceTable, sourceId)` | row in that service’s table |

Integrity depends on **application logic** and **gateway filtering** (e.g. `organizationId` query params).

---

## 13. Access control enforcement

### 13.1 API Gateway (GraphQL + `/upload`)

**Authentication**

- JWT in `Authorization: Bearer <token>`.
- **`getCurrentUser`** → **`POST /auth/me`** on auth-service with body **`{ organizationId }`** when header **`X-Organization-Id`** is set (membership + permissions resolved for that org).
- In-memory **cache** (~30s TTL) keyed by token + org header.

**Authorization helpers** (`apps/api-gateway/src/lib/auth.ts`)

| Helper | Behavior |
|--------|----------|
| `requireAuth` | Valid user; rejects **paused** users |
| `requireOrganizer` | Role name **Organizer** |
| `requirePermission(resource, action)` | **`permissions[resource]`** contains action or `*`; **Organizer bypass** |
| `hasMetaPermission` | **`permissions._meta`** contains token |
| `requireOrganization(context, orgId)` | User’s **`organizationId`** must equal `orgId` |
| `getOrgId(user)` | Current org id or GraphQL error |

Resolvers combine these patterns: e.g. **`teams`** uses **`requirePermission(..., 'teams', 'read')`** and **`organizationId`** from args or **`getOrgId(user)`**; **`activityLogs`** defaults org scope and passes **`organizationId`** to auth REST.

**Important:** GraphQL is the **central authorization gate** for clients calling through the gateway.

### 13.2 Auth service (REST)

- Implements login, refresh, **`/auth/me`**, org/user/role CRUD, etc.
- **`apps/auth-service/src/lib/permission-middleware.ts`** defines Express middleware **`requirePermission(resource, action)`** using **static role templates** (`getDefaultPermissions`)—useful for **direct** auth-service routes if mounted with **`req.user`** populated.
- Many auth routes rely on **controller-level** checks rather than this middleware; **read routes that apply** to your deployment.

### 13.3 AI engine

- **Fastify auth plugin** validates Bearer JWT via **`POST {AUTH_SERVICE}/auth/me`** (same idea as gateway); caches ~30s.
- **RAG**: **`getReadableContentTypes`** filters vector search by mapping content types → **`requirePermission(..., read)`** (`rbac.service.ts`).
- **Agent tools**: **`TOOL_PERMISSIONS`** maps each tool name → **resource + action**; tools filtered before LLM sees them (`filterToolsByPermission`).
- **Organizer** bypass matches gateway behavior.

### 13.4 Domain microservices (project, workforce, client, knowledge, …)

- Each sampled Express app applies **`bearerAuthMiddleware`** after **`cors`** / **`express.json()`** so **Bearer JWTs are validated** against the auth service unless **`SKIP_INTERNAL_SERVICE_AUTH`** or a **default skip path** applies.
- **`permission-middleware.ts`** (auth-service) **`requireProjectAccess`**, **`requireTaskAccess`**, and **`requireTeamManager`** call project/workforce HTTP APIs (**`PROJECT_SERVICE_URL`**, **`WORKFORCE_SERVICE_URL`**) and enforce **organization** (and manager for teams) when those middlewares are used on routes.

### 13.5 Communication WebSocket

- Socket middleware (`socket.ts`) resolves identity by validating a JWT: **`handshake.auth.token`** or **`Authorization: Bearer`**, then **`POST {AUTH_SERVICE_URL}/auth/me`** (optional **`handshake.auth.organizationId`** checked against the token’s org). **`userId`** / **`organizationId`** on the socket come **only** from the auth response, not from client-supplied IDs alone.

### 13.6 Upload route (`api-gateway`)

- Uses **`requireAuth`** for presigned/upload flows—aligned with gateway auth.

---

## 14. AI-specific RBAC mapping (reference)

From **`apps/ai-engine/src/app/types.ts`**:

- **Content types** (`organization`, `project`, `task`, …) map to **resource/action** pairs for **read** filtering in RAG (`CONTENT_TYPE_TO_RESOURCE`).
- **Tool names** map to **`TOOL_PERMISSIONS`** (create/read/update across projects, tasks, clients, teams, wiki, users).

---

## 15. Residual risks and operators’ checklist

1. **`SKIP_INTERNAL_SERVICE_AUTH`**: If left **`true`** in production, microservices accept unauthenticated HTTP—disable in deployed environments.
2. **Socket clients**: Must send **`handshake.auth.token`** (or **`Authorization`**)—raw **`userId`** alone is no longer accepted.
3. **ActivityLog migration**: Existing DBs need the migration that **`DELETE`s rows with NULL `userId`** then sets **`NOT NULL`**—run **`prisma migrate deploy`** (or equivalent) before relying on the constraint.
4. **HTTP middleware vs gateway RBAC**: **`requirePermission`** on auth-service routes uses **template** defaults; the gateway uses **stored JSON** from **`/auth/me`**—keep role matrices consistent when you change permissions.
5. **Defense in depth**: Even with JWT validation on services, **segment internal networks**, use **TLS**, and consider **mTLS / workload identity** where policy requires stronger service-to-service trust than “same JWT as the user.”

---

## 16. Summary table: where tenancy is stored

| Tenant key | Typical location |
|------------|------------------|
| **Organization** | `organizationId` on Project, Team, Wiki, ChatChannel, RagDocument, ConversationHistory, ReportSchedule, Client (optional), etc. |
| **User** | String UUIDs referencing auth users across services |
| **RAG / AI** | `ai_engine.rag_documents.organizationId` + content-type RBAC |

This document is intended to be the **single map** of entities, cross-service links, and enforcement points for backend and security reviews.
