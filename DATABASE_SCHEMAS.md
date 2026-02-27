# Database Schemas Documentation

This document provides a comprehensive overview of all database schemas used across the Vistone Server microservices architecture.

## Table of Contents

1. [Auth Service Schema](#auth-service-schema)
2. [Project Management Schema](#project-management-schema)
3. [Client Management Schema](#client-management-schema)
4. [Communication Schema](#communication-schema)
5. [Knowledge Hub Schema](#knowledge-hub-schema)
6. [Workforce Management Schema](#workforce-management-schema)
7. [Notification Schema](#notification-schema)
8. [Monitoring & Reporting Schema](#monitoring--reporting-schema)
9. [AI Engine Schema](#ai-engine-schema)

---

## Auth Service Schema

**Database Schema:** `auth`  
**Location:** `apps/auth-service/prisma/schema.prisma`

Handles user authentication, organization management, and access control.

### Models

#### Organization

| Field     | Type          | Description                    |
| --------- | ------------- | ------------------------------ |
| id        | String (UUID) | Primary key                    |
| name      | String        | Organization name              |
| slug      | String        | Unique URL-friendly identifier |
| settings  | Json?         | Organization settings          |
| createdAt | DateTime      | Creation timestamp             |
| updatedAt | DateTime      | Last update timestamp          |
| deletedAt | DateTime?     | Soft delete timestamp          |

**Relations:** members, roles

#### User

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| email     | String        | Unique email address  |
| firstName | String?       | User's first name     |
| lastName  | String?       | User's last name      |
| password  | String?       | Hashed password       |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |
| deletedAt | DateTime?     | Soft delete timestamp |

**Relations:** organizationMemberships, kycData, mfaSettings, activityLogs

#### OrganizationMember

| Field          | Type          | Description               |
| -------------- | ------------- | ------------------------- |
| id             | String (UUID) | Primary key               |
| organizationId | String        | Reference to organization |
| userId         | String        | Reference to user         |
| roleId         | String?       | Reference to role         |
| createdAt      | DateTime      | Creation timestamp        |
| updatedAt      | DateTime      | Last update timestamp     |

**Relations:** organization, user, role

#### Role

| Field          | Type          | Description                                                         |
| -------------- | ------------- | ------------------------------------------------------------------- |
| id             | String (UUID) | Primary key                                                         |
| organizationId | String?       | Reference to organization                                           |
| name           | String        | Role name (must be one of: Organizer, Manager, Contributor, Client) |
| permissions    | Json          | Permission definitions                                              |
| isSystem       | Boolean       | System role flag (default: false)                                   |
| createdAt      | DateTime      | Creation timestamp                                                  |
| updatedAt      | DateTime      | Last update timestamp                                               |

**Valid Role Names:**

- **Organizer** (Internal): Full system access. Creates projects, teams, assigns managers.
- **Manager** (Internal): Manages teams and contributors. Delegates tasks within assigned teams.
- **Contributor** (Internal): Team member. Receives and works on assigned tasks.
- **Client** (External): Portal access only. Read-only view of specific projects.

**Relations:** organization, members

#### KycData

| Field      | Type          | Description                |
| ---------- | ------------- | -------------------------- |
| id         | String (UUID) | Primary key                |
| userId     | String        | Reference to user (unique) |
| status     | String        | KYC verification status    |
| documents  | Json?         | KYC document metadata      |
| verifiedAt | DateTime?     | Verification timestamp     |
| createdAt  | DateTime      | Creation timestamp         |
| updatedAt  | DateTime      | Last update timestamp      |

**Relations:** user

#### MfaSetting

| Field       | Type          | Description                       |
| ----------- | ------------- | --------------------------------- |
| id          | String (UUID) | Primary key                       |
| userId      | String        | Reference to user (unique)        |
| enabled     | Boolean       | MFA enabled flag (default: false) |
| secret      | String?       | MFA secret key                    |
| backupCodes | String[]      | Backup recovery codes             |
| createdAt   | DateTime      | Creation timestamp                |
| updatedAt   | DateTime      | Last update timestamp             |

**Relations:** user

#### ActivityLog

| Field      | Type          | Description                |
| ---------- | ------------- | -------------------------- |
| id         | String (UUID) | Primary key                |
| userId     | String?       | Reference to user          |
| action     | String        | Action performed           |
| entityType | String        | Type of entity affected    |
| entityId   | String?       | ID of entity affected      |
| metadata   | Json?         | Additional action metadata |
| ipAddress  | String?       | Client IP address          |
| userAgent  | String?       | Client user agent          |
| createdAt  | DateTime      | Creation timestamp         |

**Relations:** user

---

## Project Management Schema

**Database Schema:** `project`  
**Location:** `apps/project-management/prisma/schema.prisma`

Manages projects, tasks, milestones, and project-related AI insights.

### Models

#### Project

| Field          | Type          | Description                      |
| -------------- | ------------- | -------------------------------- |
| id             | String (UUID) | Primary key                      |
| organizationId | String        | Reference to organization        |
| name           | String        | Project name                     |
| description    | String?       | Project description              |
| status         | String        | Project status                   |
| startDate      | DateTime?     | Project start date               |
| endDate        | DateTime?     | Project end date                 |
| budget         | Decimal?      | Total budget                     |
| spentBudget    | Decimal?      | Budget spent                     |
| progress       | Int           | Progress percentage (default: 0) |
| clientId       | String?       | Reference to client              |
| managerId      | String?       | Reference to manager             |
| teamIds        | String[]      | Array of team IDs                |
| metadata       | Json?         | Additional metadata              |
| createdAt      | DateTime      | Creation timestamp               |
| updatedAt      | DateTime      | Last update timestamp            |
| deletedAt      | DateTime?     | Soft delete timestamp            |

**Relations:** members, tasks, milestones, risks, aiInsights

#### ProjectMember

| Field     | Type          | Description            |
| --------- | ------------- | ---------------------- |
| id        | String (UUID) | Primary key            |
| projectId | String        | Reference to project   |
| userId    | String        | Reference to user      |
| role      | String?       | Member role in project |
| createdAt | DateTime      | Creation timestamp     |
| updatedAt | DateTime      | Last update timestamp  |

**Relations:** project

#### Task

| Field         | Type          | Description              |
| ------------- | ------------- | ------------------------ |
| id            | String (UUID) | Primary key              |
| projectId     | String        | Reference to project     |
| parentId      | String?       | Reference to parent task |
| assigneeId    | String?       | Reference to assignee    |
| title         | String        | Task title               |
| description   | String?       | Task description         |
| status        | String        | Task status              |
| priority      | String?       | Task priority            |
| dueDate       | DateTime?     | Task due date            |
| aiSuggestions | Json?         | AI-generated suggestions |
| createdAt     | DateTime      | Creation timestamp       |
| updatedAt     | DateTime      | Last update timestamp    |

**Relations:** project, parent, subtasks, checklists, dependencies, dependentOn, aiInsights

#### TaskChecklist

| Field       | Type          | Description                        |
| ----------- | ------------- | ---------------------------------- |
| id          | String (UUID) | Primary key                        |
| taskId      | String        | Reference to task                  |
| item        | String        | Checklist item text                |
| isCompleted | Boolean       | Completion status (default: false) |
| createdAt   | DateTime      | Creation timestamp                 |
| updatedAt   | DateTime      | Last update timestamp              |

**Relations:** task

#### TaskDependency

| Field       | Type          | Description                    |
| ----------- | ------------- | ------------------------------ |
| id          | String (UUID) | Primary key                    |
| taskId      | String        | Reference to dependent task    |
| dependsOnId | String        | Reference to prerequisite task |
| type        | String        | Dependency type                |
| createdAt   | DateTime      | Creation timestamp             |
| updatedAt   | DateTime      | Last update timestamp          |

**Relations:** task, dependsOn

#### Milestone

| Field       | Type          | Description           |
| ----------- | ------------- | --------------------- |
| id          | String (UUID) | Primary key           |
| projectId   | String        | Reference to project  |
| title       | String        | Milestone title       |
| description | String?       | Milestone description |
| dueDate     | DateTime?     | Due date              |
| status      | String        | Milestone status      |
| createdAt   | DateTime      | Creation timestamp    |
| updatedAt   | DateTime      | Last update timestamp |

**Relations:** project

#### RiskRegister

| Field          | Type          | Description           |
| -------------- | ------------- | --------------------- |
| id             | String (UUID) | Primary key           |
| projectId      | String        | Reference to project  |
| description    | String        | Risk description      |
| probability    | String?       | Risk probability      |
| impact         | String?       | Risk impact level     |
| mitigationPlan | String?       | Mitigation strategy   |
| status         | String        | Risk status           |
| createdAt      | DateTime      | Creation timestamp    |
| updatedAt      | DateTime      | Last update timestamp |

**Relations:** project

#### AiInsight

| Field      | Type          | Description                      |
| ---------- | ------------- | -------------------------------- |
| id         | String (UUID) | Primary key                      |
| projectId  | String?       | Reference to project             |
| taskId     | String?       | Reference to task                |
| content    | String        | Insight content                  |
| confidence | Float?        | Confidence score                 |
| actionable | Boolean       | Actionable flag (default: false) |
| createdAt  | DateTime      | Creation timestamp               |

**Relations:** project, task

---

## Client Management Schema

**Database Schema:** `client`  
**Location:** `apps/client-management/prisma/schema.prisma`

Manages clients, client-project relationships, feedback, and proposals.

### Models

#### Client

| Field        | Type          | Description                           |
| ------------ | ------------- | ------------------------------------- |
| id           | String (UUID) | Primary key                           |
| name         | String        | Client name                           |
| contactInfo  | Json?         | Contact information                   |
| portalAccess | Boolean       | Client portal access (default: false) |
| createdAt    | DateTime      | Creation timestamp                    |
| updatedAt    | DateTime      | Last update timestamp                 |

**Relations:** projects, feedback, proposals

#### ProjectClient

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| projectId | String        | Reference to project  |
| clientId  | String        | Reference to client   |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

**Relations:** client

#### ClientFeedback

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| clientId  | String        | Reference to client   |
| projectId | String?       | Reference to project  |
| rating    | Int?          | Feedback rating       |
| comment   | String?       | Feedback comment      |
| response  | String?       | Response to feedback  |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

**Relations:** client

#### Proposal

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| clientId  | String        | Reference to client   |
| title     | String        | Proposal title        |
| content   | String?       | Proposal content      |
| status    | String        | Proposal status       |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

**Relations:** client

---

## Communication Schema

**Database Schema:** `communication`  
**Location:** `apps/communication/prisma/schema.prisma`

Manages chat channels, messages, and communication logs.

### Models

#### ChatChannel

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| name      | String?       | Channel name          |
| type      | String        | Channel type          |
| teamId    | String?       | Reference to team     |
| projectId | String?       | Reference to project  |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

**Relations:** members, messages

#### ChannelMember

| Field     | Type          | Description            |
| --------- | ------------- | ---------------------- |
| id        | String (UUID) | Primary key            |
| channelId | String        | Reference to channel   |
| userId    | String        | Reference to user      |
| role      | String?       | Member role in channel |
| createdAt | DateTime      | Creation timestamp     |
| updatedAt | DateTime      | Last update timestamp  |

**Relations:** channel

#### ChatMessage

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| channelId | String        | Reference to channel  |
| senderId  | String        | Reference to sender   |
| content   | String        | Message content       |
| aiFlags   | Json?         | AI-related flags      |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

**Relations:** channel, mentions, attachments

#### MessageMention

| Field     | Type          | Description                 |
| --------- | ------------- | --------------------------- |
| id        | String (UUID) | Primary key                 |
| messageId | String        | Reference to message        |
| userId    | String        | Reference to mentioned user |
| createdAt | DateTime      | Creation timestamp          |

**Relations:** message

#### MessageAttachment

| Field     | Type          | Description          |
| --------- | ------------- | -------------------- |
| id        | String (UUID) | Primary key          |
| messageId | String        | Reference to message |
| url       | String        | Attachment URL       |
| fileType  | String        | File type            |
| createdAt | DateTime      | Creation timestamp   |

**Relations:** message

#### CommunicationLog

| Field     | Type          | Description        |
| --------- | ------------- | ------------------ |
| id        | String (UUID) | Primary key        |
| type      | String        | Log type           |
| details   | Json          | Log details        |
| createdAt | DateTime      | Creation timestamp |

---

## Knowledge Hub Schema

**Database Schema:** `knowledge`  
**Location:** `apps/knowledge-hub/prisma/schema.prisma`

Manages documentation, wiki pages, and document storage.

### Models

#### WikiPage

| Field     | Type          | Description              |
| --------- | ------------- | ------------------------ |
| id        | String (UUID) | Primary key              |
| title     | String        | Page title               |
| content   | String?       | Page content             |
| parentId  | String?       | Reference to parent page |
| createdAt | DateTime      | Creation timestamp       |
| updatedAt | DateTime      | Last update timestamp    |

**Relations:** parent, children, versions

#### WikiPageVersion

| Field      | Type          | Description            |
| ---------- | ------------- | ---------------------- |
| id         | String (UUID) | Primary key            |
| wikiPageId | String        | Reference to wiki page |
| content    | String        | Version content        |
| version    | Int           | Version number         |
| createdAt  | DateTime      | Creation timestamp     |

**Relations:** wikiPage

#### DocumentFolder

| Field          | Type          | Description                |
| -------------- | ------------- | -------------------------- |
| id             | String (UUID) | Primary key                |
| organizationId | String        | Reference to organization  |
| name           | String        | Folder name                |
| parentId       | String?       | Reference to parent folder |
| createdAt      | DateTime      | Creation timestamp         |
| updatedAt      | DateTime      | Last update timestamp      |

**Relations:** parent, children, documents

#### Document

| Field          | Type          | Description                 |
| -------------- | ------------- | --------------------------- |
| id             | String (UUID) | Primary key                 |
| organizationId | String        | Reference to organization   |
| folderId       | String?       | Reference to folder         |
| projectId      | String?       | Reference to project        |
| name           | String        | Document name               |
| url            | String        | Document URL                |
| version        | Int           | Version number (default: 1) |
| metadata       | Json?         | Additional metadata         |
| createdAt      | DateTime      | Creation timestamp          |
| updatedAt      | DateTime      | Last update timestamp       |

**Relations:** folder, permissions, links

#### DocumentPermission

| Field      | Type          | Description           |
| ---------- | ------------- | --------------------- |
| id         | String (UUID) | Primary key           |
| documentId | String        | Reference to document |
| userId     | String?       | Reference to user     |
| roleId     | String?       | Reference to role     |
| permission | String        | Permission type       |
| createdAt  | DateTime      | Creation timestamp    |
| updatedAt  | DateTime      | Last update timestamp |

**Relations:** document

#### DocumentLink

| Field      | Type          | Description           |
| ---------- | ------------- | --------------------- |
| id         | String (UUID) | Primary key           |
| documentId | String        | Reference to document |
| entityType | String        | Linked entity type    |
| entityId   | String        | Linked entity ID      |
| createdAt  | DateTime      | Creation timestamp    |
| updatedAt  | DateTime      | Last update timestamp |

**Relations:** document

---

## Workforce Management Schema

**Database Schema:** `workforce`  
**Location:** `apps/workforce-management/prisma/schema.prisma`

Manages teams, team members, skills, and availability.

### Models

#### Team

| Field          | Type          | Description               |
| -------------- | ------------- | ------------------------- |
| id             | String (UUID) | Primary key               |
| organizationId | String        | Reference to organization |
| name           | String        | Team name                 |
| description    | String?       | Team description          |
| managerId      | String?       | Reference to manager      |
| createdAt      | DateTime      | Creation timestamp        |
| updatedAt      | DateTime      | Last update timestamp     |

**Relations:** members

#### TeamMember

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| teamId    | String        | Reference to team     |
| userId    | String        | Reference to user     |
| role      | String?       | Member role           |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

**Relations:** team

#### UserSkill

| Field       | Type          | Description           |
| ----------- | ------------- | --------------------- |
| id          | String (UUID) | Primary key           |
| userId      | String        | Reference to user     |
| skillName   | String        | Skill name            |
| proficiency | Int?          | Proficiency level     |
| createdAt   | DateTime      | Creation timestamp    |
| updatedAt   | DateTime      | Last update timestamp |

#### UserAvailability

| Field          | Type          | Description           |
| -------------- | ------------- | --------------------- |
| id             | String (UUID) | Primary key           |
| userId         | String        | Reference to user     |
| date           | DateTime      | Availability date     |
| hoursAvailable | Int           | Available hours       |
| createdAt      | DateTime      | Creation timestamp    |
| updatedAt      | DateTime      | Last update timestamp |

---

## Notification Schema

**Database Schema:** `notification`  
**Location:** `apps/notification/prisma/schema.prisma`

Manages notification templates, preferences, and notifications.

### Models

#### NotificationTemplate

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| name      | String        | Template name         |
| content   | String        | Template content      |
| channels  | Json          | Notification channels |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

#### NotificationPreference

| Field       | Type          | Description           |
| ----------- | ------------- | --------------------- |
| id          | String (UUID) | Primary key           |
| userId      | String        | Reference to user     |
| preferences | Json          | User preferences      |
| createdAt   | DateTime      | Creation timestamp    |
| updatedAt   | DateTime      | Last update timestamp |

#### Notification

| Field     | Type          | Description                  |
| --------- | ------------- | ---------------------------- |
| id        | String (UUID) | Primary key                  |
| userId    | String        | Reference to user            |
| content   | String        | Notification content         |
| isRead    | Boolean       | Read status (default: false) |
| type      | String?       | Notification type            |
| createdAt | DateTime      | Creation timestamp           |

---

## Monitoring & Reporting Schema

**Database Schema:** `monitoring`  
**Location:** `apps/monitoring-reporting/prisma/schema.prisma`

Manages KPIs, reports, automation, and dashboards.

### Models

#### KpiDefinition

| Field     | Type          | Description             |
| --------- | ------------- | ----------------------- |
| id        | String (UUID) | Primary key             |
| name      | String        | KPI name                |
| formula   | String?       | KPI calculation formula |
| createdAt | DateTime      | Creation timestamp      |
| updatedAt | DateTime      | Last update timestamp   |

**Relations:** measurements

#### KpiMeasurement

| Field      | Type          | Description           |
| ---------- | ------------- | --------------------- |
| id         | String (UUID) | Primary key           |
| kpiId      | String        | Reference to KPI      |
| value      | Float         | Measured value        |
| measuredAt | DateTime      | Measurement timestamp |
| createdAt  | DateTime      | Creation timestamp    |

**Relations:** kpi

#### ReportTemplate

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| name      | String        | Template name         |
| config    | Json          | Report configuration  |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

#### GeneratedReport

| Field      | Type          | Description           |
| ---------- | ------------- | --------------------- |
| id         | String (UUID) | Primary key           |
| templateId | String?       | Reference to template |
| url        | String        | Report URL            |
| format     | String        | Report format         |
| createdAt  | DateTime      | Creation timestamp    |

#### MemberPerformance

| Field     | Type          | Description        |
| --------- | ------------- | ------------------ |
| id        | String (UUID) | Primary key        |
| userId    | String        | Reference to user  |
| metric    | String        | Performance metric |
| value     | Float         | Metric value       |
| period    | String        | Measurement period |
| createdAt | DateTime      | Creation timestamp |

#### AiConversation

| Field      | Type          | Description           |
| ---------- | ------------- | --------------------- |
| id         | String (UUID) | Primary key           |
| userId     | String?       | Reference to user     |
| context    | Json?         | Conversation context  |
| tokensUsed | Int?          | Tokens consumed       |
| createdAt  | DateTime      | Creation timestamp    |
| updatedAt  | DateTime      | Last update timestamp |

#### AutomationRule

| Field     | Type          | Description                   |
| --------- | ------------- | ----------------------------- |
| id        | String (UUID) | Primary key                   |
| name      | String        | Rule name                     |
| trigger   | Json          | Trigger conditions            |
| actions   | Json          | Actions to execute            |
| isActive  | Boolean       | Active status (default: true) |
| createdAt | DateTime      | Creation timestamp            |
| updatedAt | DateTime      | Last update timestamp         |

#### AutomationLog

| Field     | Type          | Description        |
| --------- | ------------- | ------------------ |
| id        | String (UUID) | Primary key        |
| ruleId    | String        | Reference to rule  |
| status    | String        | Execution status   |
| details   | Json?         | Execution details  |
| createdAt | DateTime      | Creation timestamp |

#### Dashboard

| Field     | Type          | Description           |
| --------- | ------------- | --------------------- |
| id        | String (UUID) | Primary key           |
| userId    | String        | Reference to user     |
| name      | String        | Dashboard name        |
| layout    | Json?         | Dashboard layout      |
| createdAt | DateTime      | Creation timestamp    |
| updatedAt | DateTime      | Last update timestamp |

**Relations:** widgets

#### DashboardWidget

| Field       | Type          | Description            |
| ----------- | ------------- | ---------------------- |
| id          | String (UUID) | Primary key            |
| dashboardId | String        | Reference to dashboard |
| type        | String        | Widget type            |
| config      | Json?         | Widget configuration   |
| createdAt   | DateTime      | Creation timestamp     |
| updatedAt   | DateTime      | Last update timestamp  |

**Relations:** dashboard

---

## AI Engine Schema

**Database Schema:** `ai_engine`  
**Location:** `apps/ai-engine/prisma/schema.prisma`

Manages RAG (Retrieval Augmented Generation) documents, embeddings, and conversation history.

> **Note:** This schema uses the `vector` PostgreSQL extension for storing embeddings.

### Models

#### RagDocument

| Field          | Type          | Description                                    |
| -------------- | ------------- | ---------------------------------------------- |
| id             | String (UUID) | Primary key                                    |
| organizationId | String        | Reference to organization                      |
| sourceSchema   | String        | Source schema (e.g., "project", "knowledge")   |
| sourceTable    | String        | Source table name                              |
| sourceId       | String        | Source record ID                               |
| title          | String        | Document title                                 |
| content        | String        | Raw text content                               |
| contentType    | String        | Content type (e.g., "project", "task", "wiki") |
| metadata       | Json?         | Additional context                             |
| lastSyncedAt   | DateTime      | Last sync timestamp                            |
| contentHash    | String?       | Hash for change detection                      |
| createdAt      | DateTime      | Creation timestamp                             |
| updatedAt      | DateTime      | Last update timestamp                          |

**Relations:** embeddings  
**Unique Constraint:** [sourceSchema, sourceTable, sourceId]

#### RagEmbedding

| Field      | Type          | Description                  |
| ---------- | ------------- | ---------------------------- |
| id         | String (UUID) | Primary key                  |
| documentId | String        | Reference to RAG document    |
| chunkIndex | Int           | Chunk index (default: 0)     |
| chunkText  | String        | Text chunk that was embedded |
| embedding  | vector(1024)? | Mistral embedding vector     |
| createdAt  | DateTime      | Creation timestamp           |

**Relations:** document

#### ConversationHistory

| Field          | Type          | Description                          |
| -------------- | ------------- | ------------------------------------ |
| id             | String (UUID) | Primary key                          |
| organizationId | String        | Reference to organization            |
| userId         | String        | Reference to user                    |
| sessionId      | String        | Conversation session ID              |
| role           | String        | Message role ("user" or "assistant") |
| content        | String        | Message content                      |
| metadata       | Json?         | Sources/citations used               |
| createdAt      | DateTime      | Creation timestamp                   |

#### SystemPromptTemplate

| Field     | Type          | Description                                 |
| --------- | ------------- | ------------------------------------------- |
| id        | String (UUID) | Primary key                                 |
| name      | String        | Template name (unique)                      |
| template  | String        | Prompt template content                     |
| category  | String        | Category (e.g., "project_query", "general") |
| isActive  | Boolean       | Active status (default: true)               |
| createdAt | DateTime      | Creation timestamp                          |
| updatedAt | DateTime      | Last update timestamp                       |

#### RagAccessControl

| Field          | Type          | Description                               |
| -------------- | ------------- | ----------------------------------------- |
| id             | String (UUID) | Primary key                               |
| organizationId | String?       | Reference to organization (null = global) |
| contentType    | String        | Content type                              |
| isEnabled      | Boolean       | Access enabled (default: true)            |
| createdAt      | DateTime      | Creation timestamp                        |
| updatedAt      | DateTime      | Last update timestamp                     |

**Unique Constraint:** [organizationId, contentType]

---

## Schema Summary

| Service                | Schema Name     | Models Count | Primary Purpose                 |
| ---------------------- | --------------- | ------------ | ------------------------------- |
| Auth Service           | `auth`          | 7            | User & organization management  |
| Project Management     | `project`       | 8            | Projects, tasks, milestones     |
| Client Management      | `client`        | 4            | Client relationships & feedback |
| Communication          | `communication` | 6            | Chat & messaging                |
| Knowledge Hub          | `knowledge`     | 6            | Documentation & wikis           |
| Workforce Management   | `workforce`     | 4            | Teams & availability            |
| Notification           | `notification`  | 3            | Notifications & preferences     |
| Monitoring & Reporting | `monitoring`    | 10           | KPIs, reports, dashboards       |
| AI Engine              | `ai_engine`     | 5            | RAG & vector storage            |

**Total Models:** 53
