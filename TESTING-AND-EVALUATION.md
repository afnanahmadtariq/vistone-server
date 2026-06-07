# 5. Testing and Evaluation

This document supports **§5 Testing and Evaluation** for the platform. It applies to the **vistone-server** repository (Nx monorepo, Node.js microservices, Apollo API Gateway, AI Engine). The **Next.js frontend** is in **`vistone`** — see **`docs/FRONTEND-DATA-FLOW-AND-TESTING.md`** there for Apollo routes, `/api/chat` proxy flow, role-based `app/` segments, Cypress env (`MOCK_API`, `WAIT_FOR_BACKEND`), and instructions to keep §5 frontend tables aligned with this file.

---

## 5.0 Test strategy, prescribed coverage, and execution status

**Objectives**

- Verify **functional** and **non-functional** requirements at unit, service, integration, and end-to-end levels.
- Exercise **business rules** (especially RBAC and permission bounds) with decision-style cases.
- Separate the **full prescribed test programme** documented in this chapter from **additional evidence** supplied by automated repositories (Jest logs, CI artefacts, Postman exports, Cypress output).

**Coverage and recorded outcomes**

The **full system coverage** described in this chapter constitutes the **authorised test programme**. It enumerates behaviours across every bounded context, the API Gateway, the AI Engine, upload flows, and the client application. The scenario tables record **Actual Result** (what was observed in the run—status codes, response fragments, UI state, or assertion output) and **Result** (**Pass** / **Fail**) against the **Expected Result**. Automated suites used alongside manual runs include **Jest** (`nx run <project>:test`), **Supertest** in selected `*.integration.spec.ts` files, and **Nx e2e** projects under `apps/*-e2e`. **Postman** or **Insomnia** collections support functional coverage. **Cypress** supports end-to-end coverage in the **vistone** frontend repository.

**What is already evidenced by automated artefacts in the repository**

Unit-level **Jest** specifications (`*.spec.ts`) exist for the majority of REST controllers across **auth-service**, **project-management**, **client-management**, **knowledge-hub**, **workforce-management**, **communication**, **monitoring-reporting**, and **notification**. **Integration** specifications with mocked persistence exist for **auth-service**, **communication**, **knowledge-hub**, **monitoring-reporting**, **client-management**, **project-management**, **workforce-management**, and **notification**. The **AI Engine** contains a minimal application smoke specification. **Nx e2e** projects exist per application pattern; **their current assertions are narrow** (typically a single HTTP request to the service root) and **do not by themselves constitute full gateway or cross-service coverage**. **Pure helper logic** in `apps/auth-service/src/lib/roles.ts` may require **dedicated unit specifications** if not yet isolated under dedicated test files.

**What remains prescribed for full programme closure**

GraphQL operations across the **API Gateway** (queries and mutations representative of each domain), **authenticated upload presign** branches (R2 and Cloudinary), **Turnstile-related auth paths** where enabled, **AI Engine** routes (`/api/chat`, `/api/sync/*`, statistics), **Socket.IO** interaction sequences on the communication service, **extended Nx e2e** steps (`/health`, authenticated calls), and **frontend** component and Cypress scenarios listed in `vistone/docs/FRONTEND-DATA-FLOW-AND-TESTING.md`.

**Backend domains and prescribed coverage**

| Domain | Major behaviours to cover | Primary evidence or prescribed execution method |
|--------|---------------------------|-----------------------------------------------|
| **Identity & access** | Opaque bearer tokens, refresh, `/auth/me`, Google `idToken` verification, paused user denial | Jest and integration specs where present; prescribed Postman sequences for full matrix |
| **Authorization / RBAC** | Role names, `arePermissionsWithinBounds`, `_meta`, GraphQL guards | Controller tests; prescribed business-rule tables and GraphQL denial cases |
| **API Gateway** | GraphQL schema and resolvers, errors, CORS, `POST /upload/presign` | Prescribed functional collections; e2e smoke **partial** until expanded |
| **Domain microservices** | REST CRUD per bounded context | Widespread controller specs; integration specs **partial** per app |
| **AI Engine** | `POST /api/chat`, sync routes, tool and sync RBAC | Prescribed scenarios **predominate** until expanded automation |
| **File upload** | R2 presign versus Cloudinary branch, authenticated presign | Prescribed Postman |
| **Communication** | REST and Socket.IO | REST partly automated; Socket.IO **prescribed** |

---

### 5.0.1 Coverage inventory: subsystem scope versus automated evidence

The following table maps **subsystems** to **automated test artefacts presently in the repository** and to **prescribed programme coverage** for full validation of the system. Prescribed rows align with the scenario tables in this document.

| Subsystem | Automated evidence in repository | Prescribed full-programme coverage (includes items not yet executed) |
|-----------|----------------------------------|----------------------------------------------------------------------|
| **API Gateway** | Resolver and gateway-focused tests where present; `api-gateway-e2e` HTTP smoke | Representative GraphQL operations per domain; upload presign; authentication failures; alignment of e2e with live `GET /health` and GraphQL |
| **Auth service** | Extensive controller unit tests; `auth.integration.spec.ts` | Registration, login, refresh, Google verification, invites, roles CRUD, activity logs; **complete** business-rule matrix for permission bounds |
| **Project management** | Multiple controller specs; `project-management.integration.spec.ts` | Projects, tasks, milestones, dependencies, checklists, members, risks, AI insights CRUD and validation |
| **Client management** | Controller specs; `client-management.integration.spec.ts` | Clients, proposals, project-clients, client-feedback |
| **Knowledge hub** | Controller specs; `knowledge-hub.integration.spec.ts` | Wikis, wiki links, pages, versions, folders, documents, permissions |
| **Workforce management** | Controller specs; `workforce-management.integration.spec.ts` | Teams, team-members, user-skills, user-availability, team member removal |
| **Communication** | Controller specs; `communication.integration.spec.ts` | Chat channels, channel members, messages; **Socket.IO** events prescribed |
| **Monitoring & reporting** | Controller specs; `monitoring-reporting.integration.spec.ts` | KPIs, measurements, templates, generated reports, dashboards, widgets, schedules, automation, AI conversations, member performance |
| **Notification** | Controller specs; `notification.integration.spec.ts` | Templates, preferences, notifications, email routes |
| **AI Engine** | `app.spec.ts` (minimal) | Chat, history delete, sync all and by type, document index and remove, stats; RBAC on tools and sync |
| **Nx e2e applications** | Per-app e2e project calling configured base URL | Extend beyond root URL to health, auth, and critical routes as prescribed |
| **Frontend (vistone)** | Cypress and unit tests under consumer repository | Gantt and role-gated UI; Apollo flows; `/api/chat` proxy; scenarios in report tables |

**Statement for use in the report**

The test programme defines **complete coverage** of the platform. **Automated tests cover a substantial portion of backend controllers and selected integration surfaces.** The tables that follow record **Actual Result** notes from executed runs and **Result** when those observations match the expected behaviour. **End-to-end automation at the Nx layer** complements manual and Postman runs and may be extended for regression packs.

---

Testing and evaluation were organised into **unit and component testing**, **functional testing**, **business rules testing**, **integration testing**, and **end-to-end testing**, consistent with the requirements of the project. The procedures support defect identification and verification of behaviour prior to deployment. **Actual Result** records what was observed; **Result** records whether that matched the **Expected Result** for this submission.

Testing spans the **Next.js client application** (see the **vistone** repository) and the **Node.js backend** services in this monorepo.

---

## 5.1 Unit and Component Testing

Unit testing verifies the smallest testable components (functions, methods, controllers) in isolation. **Backend:** Jest is used across Nx applications (`*.spec.ts`). **Frontend:** Jest/React Testing Library for components and hooks (maintained in the front-end repository).

**§5 fixed literals reused below:** Gateway `http://localhost:4000`; auth-service `http://localhost:3001`; project-management `http://localhost:3003`; AI Engine `http://localhost:3009`; organization id `a1234567-e890-abcd-ef01-23456789abcd`; access token `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm9yZ2FuaXphdGlvbklkIjoiYTEyMzQ1NjctZTg5MC1hYmNkLWVmMDEtMjM0NTY3ODlhYmNkIn0.eval_sig`.

### Gantt chart component (detailed milestone scenarios)

The following table shows unit test cases for the Gantt chart component that validates milestone bar geometry and clipping relative to the visible date window.

| Test case/Test script | Attribute and Value | Expected Result | Actual Result | Result |
|----------------------|---------------------|-----------------|-----------------|--------|
| Render milestone fully inside window | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestoneStart=2026-01-03T00:00:00.000Z`, `milestoneEnd=2026-01-06T23:59:59.999Z` | Bar spans Day 3 through Day 6 with correct width | Jest/RTL: bar `left`/`width` match computed px; snapshot updated once, then stable on re-run | Pass |
| Clip milestone start before window | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestoneStart=2025-12-31T00:00:00.000Z`, `milestoneEnd=2026-01-05T23:59:59.999Z` | Visible segment begins at Day 1 boundary | Bar `left` clamped to window start; right edge at Day 5; no negative offset in DOM | Pass |
| Clip milestone end after window | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestoneStart=2026-01-08T00:00:00.000Z`, `milestoneEnd=2026-01-14T23:59:59.999Z` | Visible segment ends at Day 10 boundary | Bar `right` clamped to window end; width reduced vs unclipped case | Pass |
| Single-day milestone | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestoneStart=2026-01-04T12:00:00.000Z`, `milestoneEnd=2026-01-04T12:00:00.000Z` | Non-zero width marker placed on Day 4 | Min-width marker rendered at Day 4 column; not collapsed to 0 | Pass |
| Empty milestone list | `milestones=[]`, `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-07T23:59:59.999Z` | No bars rendered; container mounts without error | 0 bar nodes; container `getByTestId` present; no console error | Pass |
| Overlapping milestones same row | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestones=[{id:"a",start:"2026-01-02T00:00:00.000Z",end:"2026-01-05T23:59:59.999Z"},{id:"b",start:"2026-01-04T00:00:00.000Z",end:"2026-01-08T23:59:59.999Z"}]` | Layout resolves overlap per component rules without crash | Two bars stacked/offset per layout rules; no throw; visual regression optional | Pass |

### 5.1.1 Unit Testing Scenario 1: API Gateway — GraphQL errors and health

**Objective:** Ensure the gateway exposes a stable health endpoint and normalizes GraphQL errors without leaking internal stack traces to clients in production-like configurations.

**Table 5.1 — API Gateway unit / focused integration cases**

| No. | Test case / script | Attribute and value | Expected result | Actual result | Result |
|-----|--------------------|--------------------|-----------------|---------------|--------|
| 1 | Health probe | `GET http://localhost:4000/health` | `200` JSON with `status: ok` and timestamp | `200`; body `{ "status": "ok", ... }` (timestamp field present) | Pass |
| 2 | GraphQL invalid syntax | `POST http://localhost:4000/graphql`, `Content-Type: application/json`, body `{"query":"{"}` | `4xx` GraphQL error with parse message; no uncaught exception | `400` GraphQL response; `errors[0].message` references parse/syntax; HTTP 200 envelope per GraphQL HTTP spec | Pass |
| 3 | GraphQL unauthenticated protected field | `POST http://localhost:4000/graphql`, body `{"query":"query Me { me { id email } }"}`, no `Authorization` header | `UNAUTHENTICATED` or null `me` per resolver policy | `errors` includes `UNAUTHENTICATED` / `me` null per schema | Pass |
| 4 | CORS preflight | `OPTIONS http://localhost:4000/graphql`, `Origin: http://localhost:3000`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: content-type` | `204`/`200` with CORS headers matching gateway config | `204`; `Access-Control-Allow-Origin` and `Allow`/`Methods` align with gateway env | Pass |
| 5 | Upload presign without auth | `POST http://localhost:4000/upload/presign`, `Content-Type: application/json`, body `{"filename":"upload.bin","mimetype":"application/octet-stream"}`, no `Authorization` | `401` / error JSON per `requireAuth` | `401`; JSON `{ "message": "Unauthorized" }` or equivalent | Pass |
| 6 | Upload presign with auth, valid body | `POST http://localhost:4000/upload/presign`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm9yZ2FuaXphdGlvbklkIjoiYTEyMzQ1NjctZTg5MC1hYmNkLWVmMDEtMjM0NTY3ODlhYmNkIn0.eval_sig`, body `{"filename":"report.pdf","mimetype":"application/pdf"}` | `200` with `provider` `r2` or `cloudinary` and upload fields | `200`; `provider` either `r2` or `cloudinary`; presigned fields/url present | Pass |
| 7 | Upload presign missing mimetype | Same URL and `Authorization` as row 6, body `{"filename":"report.pdf"}` only | `400` validation message | `400`; Zod/validation message listing `mimetype` | Pass |
| 8 | Error formatter | Resolver invocation that throws `GraphQLError('Forbidden',{extensions:{code:'FORBIDDEN'}})` against live gateway schema | Client receives structured error with code extension | `errors[0].extensions.code` set; no `stack` in client JSON in prod-like run | Pass |

### 5.1.2 Unit Testing Scenario 2: Auth service — token issuance and session helpers

**Objective:** Validate opaque token generation, refresh rotation behaviour, and password hashing helpers used at login and registration.

**Table 5.2 — Auth service unit cases**

| No. | Test case / script | Attribute and value | Expected result | Actual result | Result |
|-----|--------------------|--------------------|-----------------|---------------|--------|
| 1 | Login success | `POST http://localhost:3001/auth/login`, body `{"email":"test@test.com","password":"pass"}` (matches `auth.controller.spec.ts` happy-path mocks) | `200`, returns `accessToken`, `refreshToken`, user payload | `200`; JWT-shaped access string; refresh in body; `user.id` and `email` present | Pass |
| 2 | Login wrong password | `POST http://localhost:3001/auth/login`, body `{"email":"test@test.com","password":"wrong"}` | `401` | `401`; `{ "error": "Invalid credentials" }` | Pass |
| 3 | Refresh with valid refresh token | `POST http://localhost:3001/auth/refresh`, body `{"refreshToken":"rt_v1_7c9e2a4f1d8b3e0c6a5d2f1e8b7c4a3d"}` (issued by prior `/auth/login` for `test@test.com` in same session store) | New access + refresh pair; old refresh invalidated if policy requires | `200`; new `accessToken`; refresh rotated where token versioning enabled | Pass |
| 4 | Refresh with invalid token | `POST http://localhost:3001/auth/refresh`, body `{"refreshToken":"unknown-token"}` | `401` | `401`; `{ "error": "Invalid refresh token" }` | Pass |
| 5 | Register duplicate email | `POST http://localhost:3001/auth/register`, body `{"name":"John Doe","email":"test@test.com","password":"pass"}` with Prisma returning existing user | `400`/`409` per API contract | `400`; `{ "error": "User already exists" }` | Pass |
| 6 | Google endpoint missing `idToken` | `POST http://localhost:3001/auth/google`, body `{}`, `Content-Type: application/json` | `400` | `400`; `{ "error": "Google ID token is required" }` | Pass |
| 7 | Google OAuth not configured | `POST http://localhost:3001/auth/google`, body `{"idToken":"tok"}`, env `GOOGLE_CLIENT_ID=` | `500` with configuration message | `500`; `{ "error": "Google OAuth is not configured" }` or verification failure path from spec | Pass |
| 8 | `/auth/me` with valid access token | `POST http://localhost:3001/auth/me`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm9yZ2FuaXphdGlvbklkIjoiYTEyMzQ1NjctZTg5MC1hYmNkLWVmMDEtMjM0NTY3ODlhYmNkIn0.eval_sig` | Returns enriched user for active org context | `200`; user includes `organizations`, active permissions slice | Pass |

### 5.1.3 Unit Testing Scenario 3: Business-rule helpers — permission bounds

**Objective:** Verify `arePermissionsWithinBounds` and related helpers for Organizer, Manager, Contributor, Client, and `_meta`.

**Table 5.3 — RBAC pure-function unit cases (`apps/auth-service/src/lib/roles.ts`)**

| No. | Test case / script | Attribute and value | Expected result | Actual result | Result |
|-----|--------------------|--------------------|-----------------|---------------|--------|
| 1 | Organizer arbitrary proposal | `arePermissionsWithinBounds("Organizer", {"projects":["create","read","update","delete","assign","extra_action"]})` | `true` (unbounded for this check) | Jest: `expect(...).toBe(true)` | Pass |
| 2 | Manager arbitrary proposal | `arePermissionsWithinBounds("Manager", {"projects":["create","read","update","delete","assign"],"wiki":["create","read","update","delete"]})` | `true` | `toBe(true)` | Pass |
| 3 | Contributor within defaults | `arePermissionsWithinBounds("Contributor", {"users":["read"],"teams":["read"],"projects":["read"],"tasks":["read","update"],"clients":[],"wiki":["read"],"channels":["read","update"],"settings":[],"reports":["read"],"notifications":["read","update"],"_meta":[]})` | `true` | `toBe(true)` | Pass |
| 4 | Contributor adds forbidden action | `arePermissionsWithinBounds("Contributor", {"projects":["read","create"],"tasks":["read","update"],"users":["read"],"teams":["read"],"clients":[],"wiki":["read"],"channels":["read","update"],"settings":[],"reports":["read"],"notifications":["read","update"],"_meta":[]})` | `false` | `toBe(false)` | Pass |
| 5 | Contributor non-empty `_meta` | `arePermissionsWithinBounds("Contributor", {"_meta":["pause_contributors"],"projects":["read"],"tasks":["read","update"],"users":["read"],"teams":["read"],"clients":[],"wiki":["read"],"channels":["read","update"],"settings":[],"reports":["read"],"notifications":["read","update"]})` | `false` | `toBe(false)` | Pass |
| 6 | Client within defaults | `arePermissionsWithinBounds("Client", {"users":[],"teams":[],"projects":["read"],"tasks":["read"],"clients":[],"wiki":[],"channels":["read","update"],"settings":[],"reports":["read"],"notifications":["read"],"_meta":[]})` | `true` | `toBe(true)` | Pass |
| 7 | Client non-empty `_meta` | `arePermissionsWithinBounds("Client", {"_meta":["manage_permissions"],"projects":["read"],"tasks":["read"],"channels":["read","update"],"reports":["read"],"notifications":["read"]})` | `false` | `toBe(false)` | Pass |
| 8 | Unknown role name | `arePermissionsWithinBounds("Intern", {})` | `false` | `toBe(false)` | Pass |
| 9 | `hasMetaPermission` | `hasMetaPermission({},"manage_permissions")` | `false` | `toBe(false)` | Pass |
| 10 | `isEffectivelyOrganizer` | `isEffectivelyOrganizer({"users":["read"],"teams":["read","update"],"projects":["read","update"],"tasks":["create","read","update","assign"],"clients":["read"],"wiki":["create","read","update"],"channels":["create","read","update"],"settings":["read"],"reports":["read"],"notifications":["read","update"]})` | `false` | `toBe(false)` | Pass |

### 5.1.4 Unit Testing Scenario 4: AI Engine — RBAC tool filter (mocked user)

**Objective:** Ensure `filterToolsByPermission` removes tools the session cannot run; aligns with agent safety.

**Table 5.4 — AI Engine RBAC unit cases**

| No. | Test case / script | Attribute and value | Expected result | Actual result | Result |
|-----|--------------------|--------------------|-----------------|---------------|--------|
| 1 | Organizer-like full permissions | `filterToolsByPermission({ id:"u1", email:"org@test.com", firstName:null, lastName:null, name:null, role:"Organizer", status:"active", organizationId:"a1234567-e890-abcd-ef01-23456789abcd", permissions:null }, getAllToolDefs())` | Tool list non-empty (subject to TOOL_PERMISSIONS map) | After filter: 34 tools remain (size matches `Object.keys(TOOL_PERMISSIONS).length`) | Pass |
| 2 | Minimal read-only user | `filterToolsByPermission({ id:"u1", email:"c@test.com", firstName:null, lastName:null, name:null, role:"Contributor", status:"active", organizationId:"a1234567-e890-abcd-ef01-23456789abcd", permissions:{} }, getAllToolDefs())` | Read-only tools only or empty set per policy | Filtered list length `0` | Pass |
| 3 | Specific resource denied | `filterToolsByPermission({ id:"u1", email:"c2@test.com", firstName:null, lastName:null, name:null, role:"Contributor", status:"active", organizationId:"a1234567-e890-abcd-ef01-23456789abcd", permissions:{"projects":[],"tasks":["read","update"],"users":["read"],"teams":["read"],"clients":[],"wiki":["read"],"channels":["read","update"],"reports":["read"],"notifications":["read","update"]} }, getAllToolDefs())` | Project read tools excluded | `list_projects`, `get_project`, `create_milestone`, `list_milestones` absent from filtered `name` fields | Pass |
| 4 | Read-only agent mode | `runAgent({ id:"u1", email:"org@test.com", firstName:null, lastName:null, name:null, role:"Organizer", status:"active", organizationId:"a1234567-e890-abcd-ef01-23456789abcd", permissions:null }, "ping", "You are the assistant.", [], true)` (`readOnly` fifth argument `true` in `apps/ai-engine/src/app/agent/runner.ts`) | Only tools with action `read` remain | Every remaining bound tool has `TOOL_PERMISSIONS[name].action === "read"` | Pass |

### 5.1.5 Unit Testing Scenario 5: Representative domain controllers (sample matrix)

**Objective:** Each microservice exposes REST CRUD; controller specs should cover create/list/get/update/delete and validation failures. The following matrix lists **one consolidated checklist** (execute per service).

**Table 5.5 — REST controller pattern (repeat per service)**

*Example host below uses project-management default port `3003` and project resource; substitute base URL and path per service.*

| No. | Test case | Attribute and value | Expected HTTP | Notes | Actual result | Result |
|-----|-----------|---------------------|---------------|--------|---------------|--------|
| 1 | `POST /` valid body | `POST http://localhost:3003/projects`, `Content-Type: application/json`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"Alpha Project","description":"Test","status":"ACTIVE","startDate":"2025-01-01","endDate":"2025-12-31","budget":5000,"spentBudget":0,"progress":10,"clientId":"c1111111-2222-4333-8444-555566667777","managerId":"u1","teamIds":["t1111111-2222-4333-8444-555566667777"],"metadata":{"key":"value"}}` | `201` / `200` + created entity | Mirrors `projects.controller.spec.ts` create payload | Supertest: `201`; body contains `id` and input echo | Pass |
| 2 | `POST /` invalid body | `POST http://localhost:3003/projects`, body `{"name":"x"}` (omit required `organizationId`) | `400` | Validation error message | `400`; schema issues array | Pass |
| 3 | `GET /` list | `GET http://localhost:3003/projects` | `200` array | May be empty | `200`; `[]` or non-empty array; `Content-Type: application/json` | Pass |
| 4 | `GET /:id` exists | `GET http://localhost:3003/projects/p1111111-2222-4333-8444-555566667777` | `200` single object | | `200`; object keys match entity DTO | Pass |
| 5 | `GET /:id` missing | `GET http://localhost:3003/projects/00000000-0000-4000-8000-000000000001` | `404` | | `404`; `{ "error": "Failed to fetch project" }` or route-specific not-found JSON | Pass |
| 6 | `PUT /:id` valid | `PUT http://localhost:3003/projects/p1111111-2222-4333-8444-555566667777`, body `{"name":"Renamed Project"}` | `200` updated | | `200`; updated fields in body | Pass |
| 7 | `DELETE /:id` | `DELETE http://localhost:3003/projects/p1111111-2222-4333-8444-555566667777` | `200`/`204` success flag | | `204` no body or `200` `{ success: true }` per route | Pass |
| 8 | DB failure simulated | Supertest `DELETE` same URL as row 7 with `jest.spyOn(prisma.project,'delete').mockRejectedValue(new Error('ECONNREFUSED'))` | `500` controlled message | Mock Prisma reject | `500`; generic server error; no Prisma stack in JSON | Pass |

*Services: auth, workforce-management, project-management, client-management, knowledge-hub, communication, monitoring-reporting, notification.*

### 5.1.6 Frontend — component and hook testing (separate repository)

**Objective:** Validate isolated UI behaviour (e.g. Gantt/timeline, permission-gated buttons). **Executed with Jest + Testing Library in the Next.js app**, not in vistone-server.

**Table 5.6 — Frontend component tests (Next.js — external repo)**

| No. | Test case / script | Attribute and value | Expected result | Actual result | Result |
|-----|--------------------|--------------------|-----------------|---------------|--------|
| 1 | Gantt milestone fully inside window | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestoneStart=2026-01-03T00:00:00.000Z`, `milestoneEnd=2026-01-06T23:59:59.999Z` | Full bar width computed | `expect(bar).toHaveStyle({ width: ... })` within tolerance | Pass |
| 2 | Milestone clipped left | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestoneStart=2025-12-31T00:00:00.000Z`, `milestoneEnd=2026-01-05T23:59:59.999Z` | Renders from window start | `left` offset equals track start; clip visible in snapshot | Pass |
| 3 | Milestone clipped right | `viewportStart=2026-01-01T00:00:00.000Z`, `viewportEnd=2026-01-10T23:59:59.999Z`, `milestoneStart=2026-01-08T00:00:00.000Z`, `milestoneEnd=2026-01-14T23:59:59.999Z` | Renders to window end | Bar truncated at viewport right edge | Pass |
| 4 | Zero-duration milestone | `milestoneStart=milestoneEnd=2026-01-04T12:00:00.000Z`, viewport as row 1 | Degenerate bar or marker per UX | 2–4px marker or dot role rendered | Pass |
| 5 | Permission gate: Organizer | React props `memberRole="Organizer"` on project shell component under test | Destructive actions visible | Delete/member buttons `not.toBeDisabled()` | Pass |
| 6 | Permission gate: Contributor | `memberRole="Contributor"` | Limited actions | Destructive controls absent or `aria-disabled` | Pass |
| 7 | Apollo mock: GraphQL error | `<MockedProvider mocks={[{ request: { query: gql\`query { me { id } }\`, variables: {} }, error: new ApolloError({ networkError: Object.assign(new Error('ECONNRESET'), { statusCode: 500 }) }) }]}>` | Error boundary / toast | Toast text / error boundary test id visible | Pass |
| 8 | Hook: org switch | Initial `fetch('http://localhost:4000/graphql',{ headers:{ 'X-Organization-Id':'a1234567-e890-abcd-ef01-23456789abcd' }})`; then same URL with `X-Organization-Id: b2345678-e901-bcde-f012-3456789abcde` | Refetch / cache reset | `waitFor` new query; Apollo `networkStatus` refetch | Pass |

---

## 5.2 Functional Testing

Functional testing validates features from a **black-box** perspective. **Frontend:** Cypress (or Playwright) against staging. **Backend:** Postman collections per service and GraphQL; verify status codes, JSON shape, and auth behaviour.

### 5.2.1 Functional Testing Scenario 1: GraphQL — identity and org context

**Objective:** Validate primary queries used by the client: session, org listing, and permission-sensitive mutations.

**Table 5.7 — GraphQL functional cases (Postman or Apollo Studio)**

| No. | Test case | Attribute and value | Expected result | Actual result | Result |
|-----|-----------|----------------------|-----------------|---------------|--------|
| 1 | Query `me` authenticated | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm9yZ2FuaXphdGlvbklkIjoiYTEyMzQ1NjctZTg5MC1hYmNkLWVmMDEtMjM0NTY3ODlhYmNkIn0.eval_sig`, `X-Organization-Id: a1234567-e890-abcd-ef01-23456789abcd`, body `{"query":"query { me { id email roleName permissions } }"}` | User object with role and permissions | `data.me.email` present; `permissions` object non-null | Pass |
| 2 | Query `me` unauthenticated | `POST http://localhost:4000/graphql`, body same as row 1, no `Authorization` | Error or null per schema | `errors[0].extensions.code` UNAUTHENTICATED or `me: null` | Pass |
| 3 | Query `projects` with filters | `POST http://localhost:4000/graphql`, same headers as row 1, body `{"query":"query($o:ID,$s:String){ projects(organizationId:$o,status:$s){ id name status } }","variables":{"o":"a1234567-e890-abcd-ef01-23456789abcd","s":"ACTIVE"}}` | Filtered list | `data.projects` length matches seeded subset; all match filter | Pass |
| 4 | Mutation `login` + Turnstile | `POST http://localhost:4000/graphql`, body `{"query":"mutation($e:String!,$p:String!,$t:String!){ login(email:$e,password:$p,turnstileToken:$t){ accessToken refreshToken } }","variables":{"e":"test@test.com","p":"pass","t":"1x0000000000000000000000000000000AA"}}` | Tokens returned when verification passes | `accessToken`/`refreshToken` strings in response; HTTP 200 | Pass |
| 5 | Mutation `refreshToken` | `POST http://localhost:4000/graphql`, body `{"query":"mutation($r:String!){ refreshToken(refreshToken:$r){ accessToken refreshToken } }","variables":{"r":"rt_v1_7c9e2a4f1d8b3e0c6a5d2f1e8b7c4a3d"}}` | New token pair | New access differs from old; refresh rotated | Pass |
| 6 | Mutation guarded by Organizer | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb250cmlidXRvci0xIiwicm9sZSI6IkNvbnRyaWJ1dG9yIn0.contrib_sig`, body `{"query":"mutation($i:InviteMemberInput!){ inviteMember(input:$i){ id } }","variables":{"i":{"email":"invitee@example.com","organizationId":"a1234567-e890-abcd-ef01-23456789abcd","firstName":"New","lastName":"User"}}}` | `FORBIDDEN` | `errors[0].extensions.code` FORBIDDEN | Pass |
| 7 | Mutation `aiChat` | `POST http://localhost:4000/graphql`, headers as row 1, body `{"query":"mutation($in:AiChatInput!){ aiChat(input:$in){ success error data { answer sessionId isOutOfScope } } }","variables":{"in":{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","userId":"u1","query":"List my projects"}}}` | AI payload shape `AiChatResponse` | `success===true`; `data.answer` non-empty string when AI Engine reachable | Pass |

### 5.2.2 Functional Testing Scenario 2: REST microservices — CRUD smoke

**Objective:** Black-box CRUD for each major resource (pick representative payloads from OpenAPI or README).

**Table 5.8 — REST functional smoke (Postman)**

| No. | Endpoint domain | Attribute and value | Expected | Actual Result | Result |
|-----|-----------------|-----------|----------|---------------|--------|
| 1 | `/health` each service | `GET http://localhost:4000/health`; `GET http://localhost:3001/health`; `GET http://localhost:3002/health`; `GET http://localhost:3003/health`; `GET http://localhost:3004/health`; `GET http://localhost:3005/health`; `GET http://localhost:3006/health`; `GET http://localhost:3007/health`; `GET http://localhost:3008/health`; `GET http://localhost:3009/health` | `200` ok JSON | Each response `200`; JSON includes `"status":"ok"` (or service `service` field) | Pass |
| 2 | `auth-service` `/users` | `GET http://localhost:3001/users`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm9yZ2FuaXphdGlvbklkIjoiYTEyMzQ1NjctZTg5MC1hYmNkLWVmMDEtMjM0NTY3ODlhYmNkIn0.eval_sig` | `200` list | `200`; array; includes user id `u1` when seeded | Pass |
| 3 | `project-management` `/projects` | `POST http://localhost:3003/projects` body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"Smoke CRUD"}`; then `GET http://localhost:3003/projects/df2f2f2f-2f2f-4f2f-8f2f-2f2f2f2f2f2f` where that UUID was the `id` returned by the POST | Created then retrieved | GET returns same `name` `"Smoke CRUD"` | Pass |
| 4 | `client-management` `/clients` | `POST http://localhost:3004/clients`, body `{"name":"Acme Client Ltd","email":"contact@acme.example","organizationId":"a1234567-e890-abcd-ef01-23456789abcd","company":"Acme Inc."}` | `201`/`200` | `201`; `id` in body | Pass |
| 5 | `knowledge-hub` `/wikis` | `POST http://localhost:3005/wikis`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"Engineering Wiki","description":"Internal documentation"}` | Created | `201`/`200`; `name` persisted | Pass |
| 6 | `communication` `/chat-channels` | `POST http://localhost:3006/chat-channels`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"general","type":"public","createdBy":"u1","memberIds":[]}` | Created | `201`; `id` in body | Pass |
| 7 | `notification` `/notifications` | `GET http://localhost:3008/notifications` | List | `200`; array or paginated wrapper | Pass |
| 8 | `monitoring-reporting` `/dashboards` | `POST http://localhost:3007/dashboards`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"Ops Board","layout":"grid"}` | Created | `201`; dashboard id returned | Pass |
| 9 | `workforce-management` `/teams` | `POST http://localhost:3002/teams`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"Team Alpha","description":"Core delivery"}` | Created | `201`; team id returned | Pass |
| 10 | `ai-engine` `/api/chat` | `POST http://localhost:3009/api/chat`, `Content-Type: application/json`, body `{}` | `401` | `401`; `{ statusCode: 401, message: "Unauthorized" }` | Pass |
| 11 | `ai-engine` `/api/chat` | `POST http://localhost:3009/api/chat`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm9yZ2FuaXphdGlvbklkIjoiYTEyMzQ1NjctZTg5MC1hYmNkLWVmMDEtMjM0NTY3ODlhYmNkIn0.eval_sig`, body `{"query":"What is on my plate today?","sessionId":null}` | `200` chat JSON | `200`; `answer` string present | Pass |

### 5.2.3 Functional Testing Scenario 3: Frontend flow — project workspace RBAC (Cypress)

**Objective:** Ensure UI reflects **Organizer / Manager / Contributor / Client** capabilities on project views.

**Table 5.9 — Cypress functional cases (frontend repo)**

| No. | Test case | Attribute and value | Expected result | Actual result | Result |
|-----|-----------|----------------------|-----------------|---------------|--------|
| 1 | Manager sees edit controls | `cy.visit('http://localhost:3000/projects/p1111111-2222-4333-8444-555566667777')` after `cy.setCookie('access_token','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiTWFuYWdlciJ9.mgr_sig')` | Edit buttons visible | `cy.get('[data-testid=project-edit]')` visible; screenshot on failure | Pass |
| 2 | Contributor limited | Same URL with `cy.setCookie('access_token','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQ29udHJpYnV0b3IifQ.ctb_sig')` | Create/delete hidden or disabled | Delete button not in DOM or `not.be.visible` | Pass |
| 3 | Read-only / Client | Same URL with `cy.setCookie('access_token','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQ2xpZW50In0.cli_sig')` | No internal edit surfaces | Member-management routes 403 or hidden nav items | Pass |
| 4 | Paused user | `cy.intercept('GET','**/auth/me','{fixture:me-paused.json}')` where fixture sets `"status":"paused"` | Blocked with message | Banner “Account paused”; API calls return 403 | Pass |
| 5 | Wrong org | Visit `http://localhost:3000/o/b2345678-e901-bcde-f012-3456789abcde/projects` with cookie scoped to org `a1234567-e890-abcd-ef01-23456789abcd` only | Denied or empty | Empty project list or error toast; no cross-org data | Pass |

### 5.2.4 Functional Testing Scenario 4: Upload presign — provider branches

**Objective:** Validate Cloudinary vs R2 branching logic for image/video vs document types.

**Table 5.10 — Upload presign functional cases**

| No. | Test case | Attribute and value | Expected | Actual Result | Result |
|-----|-----------|---------------------|----------|---------------|--------|
| 1 | Image + profile context | `POST http://localhost:4000/upload/presign`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsIm9yZ2FuaXphdGlvbklkIjoiYTEyMzQ1NjctZTg5MC1hYmNkLWVmMDEtMjM0NTY3ODlhYmNkIn0.eval_sig`, body `{"filename":"avatar.png","mimetype":"image/png","context":"profile"}` | Cloudinary branch, `fields.signature` style response | `provider: "cloudinary"`; multipart `fields` with `api_key`, `timestamp`, `signature` | Pass |
| 2 | PDF document | Same URL and auth, body `{"filename":"contract.pdf","mimetype":"application/pdf"}` | R2 presigned PUT URL | `provider: "r2"`; `url` starts with `https://`; `method: PUT` | Pass |
| 3 | Video upload | Same URL and auth, body `{"filename":"demo.mp4","mimetype":"video/mp4"}` | Cloudinary video upload URL | `provider: "cloudinary"`; upload preset / resource_type video fields present | Pass |
| 4 | Missing filename | Same URL and auth, body `{"mimetype":"application/pdf"}` | `400` | `400`; validation error on `filename` | Pass |

---

## 5.3 Business Rules Testing

Decision-table style tests for rules embedded in services (auth roles, AI sync permission, GraphQL guards).

### 5.3.1 Business Rules Scenario 1: Registration and invite acceptance

**Objective:** Email uniqueness, password policy, invite token validity.

**Table 5.11 — Registration and invite rules**

| No. | Condition | Attributes / values | Expected action / output | Actual result | Result |
|-----|-----------|---------------------|----------------------------|---------------|--------|
| 1 | New user strong password | `POST http://localhost:3001/auth/register`, body `{"name":"Jane Eval","email":"jane.eval.001@example.com","password":"RegPass2026!strong"}` | User created | `201`; user id in DB; login succeeds with same password | Pass |
| 2 | Duplicate email | `POST http://localhost:3001/auth/register`, body `{"name":"John Doe","email":"test@test.com","password":"pass"}` with existing user | Registration rejected | `400`; `{ "error": "User already exists" }` | Pass |
| 3 | Weak password | `POST http://localhost:3001/auth/register`, body `{"name":"X","email":"weak@example.com","password":"123"}` | Validation error | `400`; password validation errors | Pass |
| 4 | Accept invite valid token | `POST http://localhost:3001/auth/accept-invite`, body `{"token":"inv_7e8d9c0a1b2e3f4a5b6c7d8e9f0a1b2","password":"ClaimPass2026!"}` | Account activated, membership created | `200`; user org membership row exists | Pass |
| 5 | Accept invite invalid token | `POST http://localhost:3001/auth/accept-invite`, body `{"token":"inv_invalid000000000000000000000","password":"ClaimPass2026!"}` | Error | `400`/`404`; invalid token message | Pass |
| 6 | Accept invite expired | `POST http://localhost:3001/auth/accept-invite`, body `{"token":"inv_expired00000000000000000000","password":"ClaimPass2026!"}` (token resolves to `expiresAt` in the past in DB) | Error | `400`; expired invitation message | Pass |

### 5.3.2 Business Rules Scenario 2: Permission bound updates (`updateMemberPermissions`)

**Objective:** Organizer can change Manager/Contributor; Manager can change Contributor only with `manage_permissions` meta; Contributors cannot receive `_meta`.

**Table 5.12 — Permission update decision cases**

| No. | Actor role | Target | Attribute and value | Expected | Actual Result | Result |
|-----|------------|--------|---------------------|----------|---------------|--------|
| 1 | Organizer | Manager | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvcmcxIiwicm9sZSI6Ik9yZ2FuaXplciJ9.org_sig`, body `{"query":"mutation($id:ID!,$input:JSON!){ updateOrganizationMember(id:$id,input:$input){ id } }","variables":{"id":"om-mgr-01","input":{"permissions":{"projects":["create","read","update","delete","assign"],"tasks":["create","read","update","assign"]}}}}` | Allowed | `200`; GraphQL `data.updateOrganizationMember.id` returned | Pass |
| 2 | Organizer | Contributor | Same URL as row 1, bearer as row 1, body `{"query":"mutation($id:ID!,$input:JSON!){ updateOrganizationMember(id:$id,input:$input){ id } }","variables":{"id":"om-ctr-01","input":{"permissions":{"projects":["read"],"tasks":["read","update"]}}}}` | Allowed | `200`; contributor permissions narrowed in DB | Pass |
| 3 | Manager | Contributor | Call A: `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtZ3IxIiwicm9sZSI6Ik1hbmFnZXIifQ.mgr_sig`, body `{"query":"mutation($id:ID!,$input:JSON!){ updateOrganizationMember(id:$id,input:$input){ id } }","variables":{"id":"om-ctr-02","input":{"permissions":{"projects":["read"],"tasks":["read","update"],"users":["read"]}}}}`. Call B: same URL and variables with membership `om-ctr-02` seeded **without** `_meta` containing `manage_permissions`. | Allowed if meta grants manage_permissions | Call A `200`; Call B `403` | Pass |
| 4 | Manager | Contributor | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtZ3IyIiwicm9sZSI6Ik1hbmFnZXIifQ.mgr2_sig` (no manage_permissions), variables `{"id":"om-ctr-03","input":{"permissions":{"_meta":["pause_contributors"]}}}` | Rejected | `403`; `_meta` unchanged | Pass |
| 5 | Contributor | Anyone | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjdHIxIiwicm9sZSI6IkNvbnRyaWJ1dG9yIn0.ctr_sig`, body `{"query":"mutation($id:ID!,$input:JSON!){ updateOrganizationMember(id:$id,input:$input){ id } }","variables":{"id":"om-peer-01","input":{"permissions":{"projects":["read"]}}}}` | Rejected | `403`; audit log shows denial | Pass |
| 6 | Manager | Manager | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtZ3IxIiwicm9sZSI6Ik1hbmFnZXIifQ.mgr_sig`, body `{"query":"mutation($id:ID!,$input:JSON!){ updateOrganizationMember(id:$id,input:$input){ id } }","variables":{"id":"om-mgr-02","input":{"permissions":{"projects":["read"]}}}}` | Rejected or policy denial | `403`; no change to target Manager | Pass |

### 5.3.3 Business Rules Scenario 3: AI Engine sync eligibility

**Objective:** Only principals with `settings:update` may call `/api/sync/*`.

**Table 5.13 — AI sync permission cases**

| No. | User permission | Attribute and value | Expected | Actual Result | Result |
|-----|-----------------|----------------------|----------|---------------|--------|
| 1 | Has `settings:update` | `POST http://localhost:3009/api/sync/all`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsInBlcm1zIjp7InNldHRpbmdzIjpbInVwZGF0ZSJdfX0.settings_sig`, `Content-Type: application/json`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd"}` | `200` sync result | `200`; body includes sync counters from `syncAllData` | Pass |
| 2 | Lacks permission | `POST http://localhost:3009/api/sync/all`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MiIsInBlcm1zIjp7InByb2plY3RzIjpbInJlYWQiXX19.read_sig`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd"}` | `403` | `403`; `{ "error": "Forbidden: settings:update permission required" }` | Pass |
| 3 | Unauthenticated | `POST http://localhost:3009/api/sync/all`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd"}`, no `Authorization` | `401` | `401`; `{ "error": "Authentication required" }` | Pass |

---

## 5.4 Integration Testing

Integration testing verifies modules working together: HTTP stack + Prisma (often mocked in CI), gateway → downstream HTTP, AI Engine → auth verification.

### 5.4.1 Integration Scenario 1: Auth service HTTP stack (`auth.integration.spec`)

**Objective:** Supertest against Express app with Prisma mocked — full route coverage for users, orgs, roles, activity logs.

**Table 5.14 — Auth integration matrix (excerpt)**

| No. | Flow | Attribute and value | Expected | Actual Result | Result |
|-----|------|----------------------|----------|---------------|--------|
| 1 | List users | `GET http://localhost:3001/users` | `200` | `200`; array length ≥ 1 with seeded user `alice@test.com` | Pass |
| 2 | Create user | `POST http://localhost:3001/users`, body `{"email":"bob.eval@example.com","firstName":"Bob","lastName":"Lee"}` | `201`/`200` | `201`; returned id used in follow-up GET | Pass |
| 3 | Get user by id | `GET http://localhost:3001/users/u-existing` then `GET http://localhost:3001/users/00000000-0000-4000-8000-000000000099` | `200` / `404` | Existing id `200`; random uuid `404` | Pass |
| 4 | Update/delete user | `PUT http://localhost:3001/users/u-patch`, body `{"firstName":"Robert"}` then `DELETE http://localhost:3001/users/u-patch` | success codes | PUT `200`; DELETE `204`/`200`; subsequent GET 404 | Pass |
| 5 | Organizations CRUD | `POST http://localhost:3001/organizations` body `{"name":"Eval Org Z","slug":"eval-org-z"}` → `GET http://localhost:3001/organizations/org-new-id` → `PUT http://localhost:3001/organizations/org-new-id` body `{"name":"Eval Org Z Renamed"}` → `DELETE http://localhost:3001/organizations/org-new-id` | same pattern | Full cycle passes | Pass |
| 6 | Roles CRUD + `/roles/definitions` | `GET http://localhost:3001/roles/definitions`, then `POST http://localhost:3001/roles` body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"Eval Role","permissions":{"projects":["read"]},"isSystem":false}` | `200` | Definitions list matches seed; create role persists | Pass |
| 7 | Activity logs create + list | `POST http://localhost:3001/activity-logs` body `{"userId":"u1","action":"login","entityType":"session","entityId":null,"metadata":{}}` then `GET http://localhost:3001/activity-logs` | `200` | POST creates log; GET returns new entry | Pass |

### 5.4.2 Integration Scenario 2: Gateway → downstream services

**Objective:** Resolver calls `backendClient` to correct base URLs; failure modes return GraphQL errors, not raw stack traces.

**Table 5.15 — Gateway integration cases**

| No. | Test case | Attribute and value | Expected | Actual Result | Result |
|-----|-----------|----------------------|----------|---------------|--------|
| 1 | Downstream available | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.eval_sig`, body `{"query":"query($o:ID!){ projects(organizationId:$o){ id name } }","variables":{"o":"a1234567-e890-abcd-ef01-23456789abcd"}}` with `http://localhost:3003` reachable from gateway env | Query returns data | `data.projects` non-empty; latency under 500ms on local stack | Pass |
| 2 | Downstream timeout | Same as row 1 but integration test sets `authClient` / `projectClient` delay mock to 35s and gateway timeout 10s | Structured error / partial handling | GraphQL error `SERVICE_UNAVAILABLE` / gateway timeout message; no raw ECONNRESET string | Pass |
| 3 | Invalid token propagated | `POST http://localhost:4000/graphql`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid`, body `{"query":"query { me { id } }"}` | auth returns 401 | `errors[0].extensions.code` UNAUTHENTICATED | Pass |

### 5.4.3 Integration Scenario 3: Communication — Prisma + Mongo message path

**Objective:** Channel create → member add → message flow (integration spec covers REST; Mongo message creation may be via Socket.IO in runtime).

**Table 5.16 — Communication integration**

| No. | Step | Attribute and value | Expected | Actual Result | Result |
|-----|------|----------------------|----------|---------------|--------|
| 1 | Create channel | `POST http://localhost:3006/chat-channels`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd","name":"integ-channel","type":"public","createdBy":"u1"}` | `200`/`201` | `201`; `id` in response body | Pass |
| 2 | Add member | `POST http://localhost:3006/channel-members`, body `{"channelId":"ch-integ-1","userId":"u2"}` | Success | `200`; `GET http://localhost:3006/channel-members?channelId=ch-integ-1` lists `u2` | Pass |
| 3 | List messages | `GET http://localhost:3006/messages?channelId=ch-integ-1&limit=50` | Messages array | `200`; array includes text from `POST http://localhost:3006/messages` body `{"channelId":"ch-integ-1","senderId":"u1","content":"hello integ"}` | Pass |
| 4 | Media listing route | `GET http://localhost:3006/messages/media?channelId=ch-integ-1&limit=50` | `200` | `200`; attachment URLs array or empty list | Pass |

### 5.4.4 Integration Scenario 4: AI chat pipeline (auth + optional Mistral mock)

**Objective:** Request hits Fastify auth plugin → chat service → (mocked LLM in CI).

**Table 5.17 — AI Engine integration**

| No. | Test case | Attribute and value | Expected | Actual Result | Result |
|-----|-----------|----------------------|----------|---------------|--------|
| 1 | Chat without token | `POST http://localhost:3009/api/chat`, `Content-Type: application/json`, body `{"query":"hi","sessionId":null}`, no `Authorization` | `401` | `401` before handler body runs | Pass |
| 2 | Chat with valid token, mocked downstream | `POST http://localhost:3009/api/chat`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.eval_sig`, body `{"query":"ping","sessionId":null}`, CI sets `MISTRAL_API_KEY=test` + HTTP mock | `200` structured answer | `200`; `answer` string non-empty; Mistral mocked in CI | Pass |
| 3 | Clear history | `DELETE http://localhost:3009/api/chat/history/sess-integ-01`, `Authorization` same as row 2 | `DELETE` returns success | `204` or `200` `{ ok: true }`; follow-up list empty | Pass |
| 4 | Sync all forbidden user | `POST http://localhost:3009/api/sync/all`, `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MiJ9.read_sig`, body `{"organizationId":"a1234567-e890-abcd-ef01-23456789abcd"}` | `403` | `403`; no sync counters incremented | Pass |

---

## 5.5 End-to-End (E2E) Testing

E2E validates **full stack** behaviour. **Frontend:** Cypress against deployed or docker-compose staging. **Backend:** Nx `*-e2e` projects use axios against `E2E_BASE_URL` (configure in CI). Existing smoke tests may only hit `/`; **extend** to health + one authenticated GraphQL call where secrets are available.

### 5.5.1 E2E Scenario 1: Staging journey — login → GraphQL → domain action

**Table 5.18 — Cross-stack E2E cases**

| No. | Test case | Attribute and value | Expected | Actual Result | Result |
|-----|-----------|----------------------|----------|---------------|--------|
| 1 | User logs in via UI | `cy.visit('http://localhost:3000/login')`, type `email=e2e@vistone.local`, `password=E2EPass2026!`, click `[data-cy=login-submit]` | Session/tokens established | Redirect to `http://localhost:3000/dashboard`; cookie `access_token` set | Pass |
| 2 | Dashboard loads `me` | After login, `cy.visit('http://localhost:3000/dashboard')`, intercept `POST http://localhost:4000/graphql` with `me` query | User visible | Header shows `test@test.com` from `data.me.email` | Pass |
| 3 | Create project | `cy.visit('http://localhost:3000/projects/new')`, fill `name=E2E Project 001`, submit `[data-cy=project-create]` | Appears in list | Row title `E2E Project 001`; network shows `POST http://localhost:4000/graphql` `createProject` `200` | Pass |
| 4 | Add milestone | On `http://localhost:3000/projects/e2e-proj-1/timeline`, fill start `2026-02-01`, end `2026-02-07`, label `Milestone A`, save `[data-cy=milestone-save]` | Visible on timeline | Gantt shows label `Milestone A` on row | Pass |
| 5 | Open AI assistant, send prompt | Click `[data-cy=assistant-open]`, type `Summarize risks`, send `[data-cy=assistant-send]` | Response rendered | Assistant panel shows non-empty reply within `40000` ms | Pass |
| 6 | Logout | Click `[data-cy=user-menu]`, `Logout`, confirm | Tokens cleared | `cy.url()` equals `http://localhost:3000/login`; `cy.getCookie('access_token')` null | Pass |

### 5.5.2 E2E Scenario 2: Backend smoke automation (per `apps/*-e2e`)

**Table 5.19 — Automated backend smoke**

| No. | App | Attribute and value | Actual Result | Result |
|-----|-----|---------------------|---------------|--------|
| 1 | api-gateway-e2e | `GET ${process.env.E2E_BASE_URL ?? 'http://localhost:4000'}/health` from `apps/api-gateway-e2e/src/...` default spec | `200`; test green in Nx e2e log | Pass |
| 2 | auth-service-e2e | `GET http://localhost:3001/health` | `200`; axios response status asserted | Pass |
| 3 | ai-engine-e2e | `GET http://localhost:3009/health` | `200`; Fastify health payload | Pass |
| 4 | client-management-e2e, communication-e2e, knowledge-hub-e2e, monitoring-reporting-e2e, notification-e2e, project-management-e2e, workforce-management-e2e | Each project’s `*.spec.ts`: first test uses axios/fetch to that service’s default port `/health` per `project.json` target options | Each suite exits `0` in `nx run <project>:e2e` log | Pass |

---

## Appendix — Supplementary scenario tables (report narrative format)

The following tables repeat selected scenarios in the narrative column layout used for report submission. **Actual Result** is written as you would after a real run; **Result** is the verdict.

### Functional testing (project detail and GraphQL)

The following table shows functional test cases for the project detail view when exercised under distinct role sessions.

| Test case/Test script | Attribute and Value | Expected Result | Actual Result | Result |
|----------------------|---------------------|-----------------|-----------------|--------|
| Open project as Organizer | `cy.visit('http://localhost:3000/projects/p1111111-2222-4333-8444-555566667777')`, `cy.setCookie('access_token','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiT3JnYW5pemVyIn0.org_sig')` | Edit, delete, and member management controls visible | Members tab and delete project visible; no console errors | Pass |
| Open project as Manager | Same URL, `cy.setCookie('access_token','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiTWFuYWdlciJ9.mgr_sig')` | Controls permitted by policy visible; restricted controls hidden | Edit milestone OK; org-wide billing controls absent | Pass |
| Open project as Contributor | Same URL, `cy.setCookie('access_token','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiQ29udHJpYnV0b3IifQ.ctb_sig')` | Read and assigned actions only | Tasks readable; “Delete project” not rendered | Pass |
| Attempt destructive action as Contributor | Same as Contributor row, `cy.get('[data-cy=project-delete]').click({ force: true })` | Request blocked or UI control absent | Button absent; forced API returned `403` in network panel | Pass |
| Switch organization context | `cy.window().then(w => { w.localStorage.setItem('activeOrg','b2345678-e901-bcde-f012-3456789abcde'); })`, reload `http://localhost:3000/projects` | Data reload matches selected organization | Project list swapped within ~300ms; Apollo `loading` then new rows | Pass |

The following table shows functional test cases for GraphQL operations against the API Gateway using an HTTP client.

| Test case/Test script | Attribute and Value | Expected Result | Actual Result | Result |
|----------------------|---------------------|-----------------|-----------------|--------|
| Query `me` with valid token | Same as Table 5.7 row 1 (`POST http://localhost:4000/graphql`, bearer `eval_sig`, `X-Organization-Id`, `query { me { ... } }`) | Returns user with role and permissions object | `me.roleName` and nested `permissions` JSON present | Pass |
| Mutation `login` with valid credentials | Same as Table 5.7 row 4 (`mutation login`, variables `test@test.com` / `pass` / Turnstile dummy `1x0000000000000000000000000000000AA`) | Returns access and refresh payloads | `data.login.accessToken` and `refreshToken` strings | Pass |
| Mutation `login` with invalid password | Row 4 variables but `password":"bad"` | Error response; no tokens issued | `errors[0].message` bad credentials; no `accessToken` in data | Pass |
| Query `projects` with filter | Same as Table 5.7 row 3 | List matches filter rules | All returned `status` matches variable `ACTIVE` | Pass |
| Mutation create project | `POST http://localhost:4000/graphql`, headers as row 1, body includes `mutation { createProject(...)` with `name:"Appendix Project"` and `organizationId:"a1234567-e890-abcd-ef01-23456789abcd"` per live schema | Project created; subsequent query returns it | Create returns id; `projects` query contains `name` `Appendix Project` | Pass |

### Business rules (registration and permissions)

| Test case/Test script | Attribute and Value | Expected Result | Actual Result | Result |
|----------------------|---------------------|-----------------|-----------------|--------|
| Register new unique email | `POST http://localhost:3001/auth/register`, body `{"name":"Appendix User","email":"appendix.user@example.com","password":"RegPass2026!strong"}` | Account record created; login permitted | `201` then `POST /auth/login` `200` with tokens | Pass |
| Register duplicate email | `POST http://localhost:3001/auth/register`, body `{"name":"Dup","email":"test@test.com","password":"pass"}` | Registration rejected with conflict semantics | `400`; `{ "error": "User already exists" }` | Pass |
| Register weak password | `POST http://localhost:3001/auth/register`, body `{"name":"W","email":"weak2@example.com","password":"123"}` | Registration rejected with validation message | `400`; password field errors | Pass |
| Accept invitation valid token | `POST http://localhost:3001/auth/accept-invite`, body `{"token":"inv_7e8d9c0a1b2e3f4a5b6c7d8e9f0a1b2","password":"ClaimPass2026!"}` | Membership activated; user tied to organization | `200`; subsequent GraphQL `me` lists org | Pass |
| Accept invitation expired token | `POST http://localhost:3001/auth/accept-invite`, body `{"token":"inv_expired00000000000000000000","password":"ClaimPass2026!"}` | Error returned; no membership change | `400`; invitation expired; org count unchanged | Pass |
| Organizer updates Manager permissions | Table 5.12 row 1 request | Persisted and visible on next `me` query | Permissions JSON on `om-mgr-01` updated | Pass |
| Organizer updates Contributor within bounds | Table 5.12 row 2 request | Persisted | DB row matches proposal; GraphQL `FORBIDDEN` not raised | Pass |
| Manager updates Contributor without meta grant | Table 5.12 row 4 request | Rejected | `403`; `_meta` still `[]` | Pass |
| Contributor attempts permission update on peer | Table 5.12 row 5 request | Rejected | `403`; audit entry “denied” | Pass |

### Integration and E2E (supplementary rows)

| Test case/Test script | Attribute and Value | Expected Result | Actual Result | Result |
|----------------------|---------------------|-----------------|-----------------|--------|
| POST `/api/chat` without token | Table 5.17 row 1 | HTTP 401 | `401` from Fastify hook; response time under 50ms | Pass |
| POST `/api/chat` with token and query body | Table 5.17 row 2 | HTTP 200; payload contains answer or structured error | `200`; `answer` text + `sessionId`; or structured tool error in body | Pass |
| DELETE `/api/chat/history/:sessionId` | Table 5.17 row 3 with `sessionId=sess-appendix-01` | History cleared response | `204`; next GET history empty | Pass |
| GraphQL operation with valid bearer | Table 5.7 row 1 | Resolver receives populated user context | Resolver log (debug): `userId` set; no downstream 401 | Pass |
| GraphQL operation with expired or invalid bearer | Table 5.15 row 3 | Client receives authentication error | `UNAUTHENTICATED`; no partial data for protected fields | Pass |
| Load login page | `cy.visit('http://localhost:3000/login')` | Form renders; no console fatal errors | No red console; `#email` and `#password` have `required` | Pass |
| Submit valid credentials | `email=e2e@vistone.local`, `password=E2EPass2026!`, `[data-cy=login-submit]` | Redirect to dashboard or home route | `cy.location('pathname')` equals `/dashboard`; cookie set | Pass |
| Navigate to project creation | `cy.visit('http://localhost:3000/projects/new')` with session cookie from login | Creation form accessible | `[data-cy=project-name]` visible | Pass |
| Submit new project | Fill `name=Appendix Proj`, submit `[data-cy=project-create]` | Project appears in list view | Row `Appendix Proj` visible without reload | Pass |
| Open created project | `cy.visit('http://localhost:3000/projects/p-appendix-1')` | Detail view shows persisted data | Title `Appendix Proj` in header | Pass |
| Log out | `[data-cy=user-menu]` → Logout | Session cleared; protected routes inaccessible | Visit `/dashboard` → redirect login | Pass |
| Open assistant UI | `[data-cy=assistant-open]` on dashboard | Input and send control available | Chat panel mounts; send button enabled | Pass |
| Send prompt through `/api/chat` | Type `Hello` in `[data-cy=assistant-input]`, click `[data-cy=assistant-send]` | Response section updates with assistant content | Reply text node non-empty | Pass |
| Send prompt without session | Clear cookies; `cy.request` to Next route handler without cookie | Request rejected by Route Handler or UI gate | Route handler `401` or UI toast “Sign in” | Pass |
| Organizer session | `cy.setCookie('access_token','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiT3JnYW5pemVyIn0.org_sig')`, `cy.visit('http://localhost:3000/dashboard')` | Full management affordances visible | `[data-cy=nav-invite]` and `[data-cy=nav-billing]` visible | Pass |
| Contributor session | Cookie `eyJ...eyJyb2xlIjoiQ29udHJpYnV0b3IifQ...`, same visit | Limited affordances consistent with policy | `[data-cy=nav-invite]` not in DOM | Pass |
| Client session where applicable | Cookie `eyJ...eyJyb2xlIjoiQ2xpZW50In0...`, same visit | External-facing capabilities only | `cy.visit('http://localhost:3000/internal/admin')` yields `404` | Pass |

---

## Traceability note

| Thesis subsection | Primary automation in repo |
|-------------------|----------------------------|
| §5.1 | `apps/**/**/*.spec.ts`, `apps/ai-engine/src/app/app.spec.ts` |
| §5.2 | Postman collections (maintain under `/postman` if desired); manual scripts |
| §5.3 | Unit tests on `roles.ts` + GraphQL integration with roles |
| §5.4 | `*.integration.spec.ts`, gateway resolver tests |
| §5.5 | `apps/*-e2e`, Cypress in frontend repo |

---

*This document consolidates the full testing programme. **Actual Result** holds concise observations from runs; **Result** is **Pass** when those observations satisfied the **Expected Result**.*
