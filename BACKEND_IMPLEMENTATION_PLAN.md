# Backend Implementation Plan for Vistone

This document outlines the backend changes, database schema updates, and API specifications required to support the frontend features implemented in the recent sessions.

---

## 1. Manager Role & Team-Based Assignment Workflow

### 1.1 Clarified Role Hierarchy

**Organizer:**

- Full system access and control
- Creates Projects, Teams, and assigns Managers to Teams
- Can customize granular permissions for any Manager, Team, or Contributor
- Assigns tasks to Teams or directly to Contributors

**Manager:**

- Assigned to one or more Teams by the Organizer
- Manages Contributors within their assigned Teams
- Receives tasks assigned to their Team(s)
- Delegates these tasks to specific Contributors within the Team
- Can view/edit tasks within their Teams (scope defined by Organizer)

**Contributor:**

- Member of one or more Teams
- Receives tasks assigned by their Manager
- Views only tasks assigned to them
- Limited project visibility (only projects they're assigned to)

**Client:**

- External portal access only
- Read-only view of specific projects

### 1.2 Task Assignment Flow

```
1. Organizer creates Task
   ↓
2. Organizer assigns Task to Team (or directly to Contributor)
   ↓
3. Manager of that Team sees unassigned Team tasks
   ↓
4. Manager assigns Task to specific Contributor in Team
   ↓
5. Contributor sees Task in their dashboard
```

---

## 2. Database Schema Updates (PostgreSQL/Prisma)

### 2.1 Teams & Managers

**Teams Table:**

```prisma
model Team {
  id              String    @id @default(uuid())
  name            String
  description     String?
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])

  // Relationships
  members         TeamMember[]
  managers        TeamManager[]
  tasks           Task[]      // Tasks assigned to this team
  projects        ProjectTeam[] // Projects this team works on

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**TeamManager Table (Many-to-Many):**

```prisma
model TeamManager {
  id          String   @id @default(uuid())
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  managerId   String
  manager     User     @relation("ManagedTeams", fields: [managerId], references: [id])
  assignedAt  DateTime @default(now())
  assignedBy  String   // Organizer who made the assignment

  @@unique([teamId, managerId])
}
```

**TeamMember Table (Many-to-Many):**

```prisma
model TeamMember {
  id            String   @id @default(uuid())
  teamId        String
  team          Team     @relation(fields: [teamId], references: [id])
  contributorId String
  contributor   User     @relation("TeamMemberships", fields: [contributorId], references: [id])
  joinedAt      DateTime @default(now())

  @@unique([teamId, contributorId])
}
```

### 2.2 Granular Permissions System

**Permissions Table:**

```prisma
model Permission {
  id              String   @id @default(uuid())
  organizationId  String

  // Subject (who has the permission)
  subjectType     String   // "USER", "TEAM", "ROLE"
  subjectId       String   // userId, teamId, or role name

  // Resource (what they can access)
  resourceType    String   // "PROJECT", "WIKI", "CLIENT", "TEAM", "CHANNEL", "ALL"
  resourceId      String?  // Specific resource ID, null = all resources of this type

  // Actions allowed
  canView         Boolean  @default(false)
  canEdit         Boolean  @default(false)
  canDelete       Boolean  @default(false)
  canCreate       Boolean  @default(false)
  canAssign       Boolean  @default(false) // For tasks

  // Metadata
  grantedBy       String   // Organizer userId
  grantedAt       DateTime @default(now())
  expiresAt       DateTime? // Optional expiration

  @@index([subjectType, subjectId])
  @@index([resourceType, resourceId])
}
```

### 2.3 Task Assignment Updates

**Tasks Table (Enhanced):**

```prisma
model Task {
  id              String    @id @default(uuid())
  title           String
  description     String?
  projectId       String
  project         Project   @relation(fields: [projectId], references: [id])

  // Team-based assignment
  assignedToTeamId String?
  assignedToTeam   Team?    @relation(fields: [assignedToTeamId], references: [id])

  // Individual assignment (after Manager delegates)
  assignedToUserId String?
  assignedToUser   User?    @relation("AssignedTasks", fields: [assignedToUserId], references: [id])

  // Assignment metadata
  teamAssignedBy   String?  // Organizer who assigned to Team
  userAssignedBy   String?  // Manager who assigned to User
  teamAssignedAt   DateTime?
  userAssignedAt   DateTime?

  status          String    // "PENDING_TEAM_ASSIGNMENT", "PENDING_USER_ASSIGNMENT", "IN_PROGRESS", "COMPLETED"
  priority        String
  dueDate         DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### 2.4 Project Management

**Risks Table:**

```prisma
model Risk {
  id                  String   @id @default(uuid())
  projectId           String
  project             Project  @relation(fields: [projectId], references: [id])
  title               String
  description         String?
  probability         String   // "LOW", "MEDIUM", "HIGH"
  impact              String   // "LOW", "MEDIUM", "HIGH"
  mitigationStrategy  String?
  status              String   // "ACTIVE", "MITIGATED", "MONITORING"
  ownerId             String
  owner               User     @relation(fields: [ownerId], references: [id])

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

**Milestones Table:**

```prisma
model Milestone {
  id          String    @id @default(uuid())
  projectId   String
  project     Project   @relation(fields: [projectId], references: [id])
  title       String
  description String?
  dueDate     DateTime
  status      String    // "PENDING", "COMPLETED", "OVERDUE"

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### 2.5 Collaboration

**Channels Table:**

```prisma
model Channel {
  id          String    @id @default(uuid())
  name        String
  type        String    // "PROJECT", "TEAM", "DIRECT", "GENERAL"
  projectId   String?
  project     Project?  @relation(fields: [projectId], references: [id])
  teamId      String?
  team        Team?     @relation(fields: [teamId], references: [id])

  messages    Message[]
  members     ChannelMember[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Messages Table:**

```prisma
model Message {
  id          String   @id @default(uuid())
  channelId   String
  channel     Channel  @relation(fields: [channelId], references: [id])
  senderId    String
  sender      User     @relation(fields: [senderId], references: [id])
  content     String
  attachments Json?    // Array of file URLs

  createdAt   DateTime @default(now())
}
```

**ChannelMembers Table:**

```prisma
model ChannelMember {
  id          String    @id @default(uuid())
  channelId   String
  channel     Channel   @relation(fields: [channelId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  lastReadAt  DateTime?

  @@unique([channelId, userId])
}
```

### 2.6 Documentation (Wiki)

**WikiPages Table:**

```prisma
model WikiPage {
  id              String        @id @default(uuid())
  title           String
  content         String        // Markdown
  category        String?
  organizationId  String
  organization    Organization  @relation(fields: [organizationId], references: [id])
  lastUpdatedBy   String
  updatedBy       User          @relation(fields: [lastUpdatedBy], references: [id])
  version         Int           @default(1)
  isPublished     Boolean       @default(false)

  versions        WikiVersion[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

**WikiVersions Table:**

```prisma
model WikiVersion {
  id          String   @id @default(uuid())
  pageId      String
  page        WikiPage @relation(fields: [pageId], references: [id])
  content     String
  changedBy   String
  user        User     @relation(fields: [changedBy], references: [id])
  changeNote  String?
  version     Int

  createdAt   DateTime @default(now())
}
```

### 2.7 Client Management

**Clients Table (Enhanced):**

```prisma
model Client {
  id                    String   @id @default(uuid())
  name                  String
  email                 String   @unique
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id])

  // Portal access
  portalAccess          Boolean  @default(true)
  portalPassword        String?  // Hashed

  // Ratings
  budgetRating          Int?     // 1-5
  communicationRating   Int?     // 1-5
  scheduleRating        Int?     // 1-5

  projects              Project[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

---

## 3. GraphQL API Specifications

### 3.1 Team & Manager Mutations

```graphql
# Create team
mutation createTeam(input: CreateTeamInput!): Team!

input CreateTeamInput {
  name: String!
  description: String
  memberIds: [ID!]     # Initial contributors
  managerIds: [ID!]    # Managers assigned to this team
}

# Assign manager to team
mutation assignManagerToTeam(teamId: ID!, managerId: ID!): TeamManager!

# Remove manager from team
mutation removeManagerFromTeam(teamId: ID!, managerId: ID!): Boolean!

# Add member to team
mutation addTeamMember(teamId: ID!, contributorId: ID!): TeamMember!

# Remove member from team
mutation removeTeamMember(teamId: ID!, contributorId: ID!): Boolean!
```

### 3.2 Task Assignment Mutations

```graphql
# Organizer assigns task to team
mutation assignTaskToTeam(taskId: ID!, teamId: ID!): Task!

# Manager assigns task to contributor
mutation assignTaskToContributor(taskId: ID!, contributorId: ID!): Task!

# Reassign task
mutation reassignTask(taskId: ID!, toUserId: ID!): Task!
```

### 3.3 Granular Permissions Mutations

```graphql
# Grant custom permission
mutation grantPermission(input: GrantPermissionInput!): Permission!

input GrantPermissionInput {
  subjectType: String!      # "USER", "TEAM", "ROLE"
  subjectId: String!        # userId, teamId, or role name
  resourceType: String!     # "PROJECT", "WIKI", "CLIENT", etc.
  resourceId: String        # Specific resource or null for all
  canView: Boolean!
  canEdit: Boolean!
  canDelete: Boolean!
  canCreate: Boolean!
  canAssign: Boolean!
  expiresAt: DateTime
}

# Revoke permission
mutation revokePermission(permissionId: ID!): Boolean!

# Get user's effective permissions for a resource
query getUserPermissions(userId: ID!, resourceType: String!, resourceId: ID): EffectivePermissions!

type EffectivePermissions {
  canView: Boolean!
  canEdit: Boolean!
  canDelete: Boolean!
  canCreate: Boolean!
  canAssign: Boolean!
  source: String!  # "ROLE", "DIRECT", "TEAM", "INHERITED"
}
```

### 3.4 Manager-Specific Queries

```graphql
# Get teams managed by this manager
query getMyManagedTeams: [Team!]!

# Get unassigned tasks for my teams
query getTeamUnassignedTasks(teamId: ID!): [Task!]!

# Get all team members for assignment
query getTeamMembers(teamId: ID!): [User!]!
```

### 3.5 Project Management Mutations

```graphql
# Risks
mutation createRisk(input: CreateRiskInput!): Risk!
mutation updateRisk(id: ID!, input: UpdateRiskInput!): Risk!
mutation deleteRisk(id: ID!): Boolean!

# Milestones
mutation createMilestone(input: CreateMilestoneInput!): Milestone!
mutation updateMilestone(id: ID!, input: UpdateMilestoneInput!): Milestone!
mutation deleteMilestone(id: ID!): Boolean!
```

### 3.6 Collaboration Mutations

```graphql
mutation createChannel(input: CreateChannelInput!): Channel!
mutation sendMessage(channelId: ID!, content: String!, attachments: [Upload]): Message!
mutation markChannelRead(channelId: ID!): Boolean!
```

### 3.7 Documentation Mutations

```graphql
mutation createWikiPage(input: CreateWikiPageInput!): WikiPage!
mutation updateWikiPage(id: ID!, input: UpdateWikiPageInput!, changeNote: String): WikiPage!
mutation deleteWikiPage(id: ID!): Boolean!
```

### 3.8 Real-time Subscriptions

```graphql
subscription onNewMessage(channelId: ID!): Message!
subscription onNotificationReceived(userId: ID!): Notification!
subscription onTaskUpdated(projectId: ID!): Task!
subscription onTaskAssignedToTeam(teamId: ID!): Task!  # For managers
```

---

## 4. Permission Resolution Algorithm

### 4.1 Permission Check Flow

```javascript
async function checkPermission(userId, action, resourceType, resourceId) {
  // 1. Get user's role
  const user = await getUser(userId);

  // 2. If Organizer, grant all permissions
  if (user.role === "ORGANIZER") return true;

  // 3. Check direct user permissions
  const directPermission = await Permission.findOne({
    subjectType: "USER",
    subjectId: userId,
    resourceType,
    resourceId,
  });
  if (directPermission && directPermission[action]) return true;

  // 4. Check team permissions (if user is in teams)
  const userTeams = await getUserTeams(userId);
  for (const team of userTeams) {
    const teamPermission = await Permission.findOne({
      subjectType: "TEAM",
      subjectId: team.id,
      resourceType,
      resourceId,
    });
    if (teamPermission && teamPermission[action]) return true;
  }

  // 5. Check role-based permissions
  const rolePermission = await Permission.findOne({
    subjectType: "ROLE",
    subjectId: user.role,
    resourceType,
    resourceId,
  });
  if (rolePermission && rolePermission[action]) return true;

  // 6. Default deny
  return false;
}
```

---

## 5. AI Services & Integrations

### 5.1 RAG (Retrieval-Augmented Generation) Pipeline

**Ingestion Service:**

- Triggered on file upload or Wiki update
- Process: Text extraction (OCR/PDF parsing) → Chunking → Embedding (OpenAI/Cohere) → Vector DB (Pinecone/pgvector)

**Query Service:**

- Used by AI Panel
- Process: User Query → Embed → Similarity Search → LLM Context Injection → Answer Generation

### 5.2 Agent Mode

**Intent Recognition:**

- Parse NL commands (e.g., "Assign this task to Team Alpha")
- Map intents to GraphQL mutations

**Action Execution:**

- Validate permissions
- Execute mutation
- Return success/failure to UI

### 5.3 Voice Processing

- Frontend handles Browser STT/TTS
- Backend supports server-side transcription (Whisper API) as fallback

---

## 6. Real-time Infrastructure (WebSockets)

**Implementation:**

- GraphQL Subscriptions using Apollo Server (ws)

**Events:**

- `MESSAGE_CREATED`: Updates Chat UI
- `NOTIFICATION_CREATED`: Updates Badge count
- `RISK_UPDATED`: Updates Risk Register
- `TASK_ASSIGNED_TO_TEAM`: Notifies Managers
- `TASK_ASSIGNED_TO_USER`: Notifies Contributors

---

## 7. Storage & File Management

**S3 Compatible Storage:**

- Buckets: `user-uploads`, `generated-reports`, `temp-transcripts`

**File Handling:**

- Presigned URLs for secure upload/download
- Virus scanning before finalizing upload

---

## 8. Audit Logging

**AuditLogs Table:**

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  action      String   // "CREATE", "UPDATE", "DELETE", "ASSIGN"
  resourceType String  // "PROJECT", "TASK", "USER", "TEAM"
  resourceId  String
  metadata    Json     // Additional context
  ipAddress   String?
  userAgent   String?

  createdAt   DateTime @default(now())
}
```

Track all:

- Destructive actions (DELETE_PROJECT, DELETE_USER, DELETE_RISK)
- Permission changes
- Task assignments
- Team/Manager assignments

---

## 9. Third-Party Integrations (Future Phase)

- **Zoom/Teams:** OAuth flow for meeting links
- **Slack:** Webhooks for notifications
- **Email (SendGrid/AWS SES):** Transactional emails
- **GitHub:** Commit/PR tracking linked to tasks

```

```
