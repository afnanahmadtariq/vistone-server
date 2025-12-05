# AI Engine - RAG with Agent Capabilities

## Overview

The AI Engine provides Retrieval-Augmented Generation (RAG) with integrated agent capabilities. This allows the AI to not only answer questions based on context but also perform actions across other microservices.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI Engine                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   RAG Core   │  │    Agent     │  │   Service Connectors │   │
│  │              │  │   Executor   │  │                      │   │
│  │ - Embeddings │  │              │  │  - HTTP Clients      │   │
│  │ - Vector DB  │  │ - Tools      │  │  - gRPC Clients      │   │
│  │ - Context    │  │ - LLM Chain  │  │    (future)          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│           │                │                    │                │
│           └────────────────┴────────────────────┘                │
│                            │                                     │
│                   ┌────────┴────────┐                           │
│                   │  Enhanced RAG   │                           │
│                   │    Service      │                           │
│                   └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Project     │   │    Client     │   │   Workforce   │
│  Management   │   │  Management   │   │  Management   │
└───────────────┘   └───────────────┘   └───────────────┘
```

## API Endpoints

### Enhanced Query (with Agent)

```http
POST /api/agent/query
Content-Type: application/json

{
  "organizationId": "org-123",
  "organizationName": "My Company",
  "userId": "user-456",
  "userName": "John Doe",
  "sessionId": "session-789",  // optional
  "query": "Create a new project called Website Redesign",
  "enableAgent": true,
  "enabledToolCategories": ["projectManagement", "clientManagement"]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "answer": "I've created the project 'Website Redesign' successfully...",
    "sessionId": "session-789",
    "isOutOfScope": false,
    "isActionResponse": true,
    "actionResult": {
      "success": true,
      "toolsUsed": ["create_project"],
      "iterations": 1
    },
    "sources": []
  }
}
```

### Execute Direct Action

```http
POST /api/agent/execute
Content-Type: application/json

{
  "organizationId": "org-123",
  "userId": "user-456",
  "action": "Create a task titled 'Review proposal' for project-789 with high priority"
}
```

### List Available Tools

```http
GET /api/agent/tools
GET /api/agent/tools?category=projectManagement
```

### Get Tool Details

```http
GET /api/agent/tools/create_project
```

### Get Agent Capabilities

```http
GET /api/agent/capabilities?organizationId=org-123&userId=user-456
```

## Available Tools

### Project Management
- `create_project` - Create a new project
- `get_project` - Get project details
- `update_project` - Update a project
- `list_projects` - List all projects
- `create_task` - Create a new task
- `get_task` - Get task details
- `update_task` - Update a task
- `list_tasks` - List tasks
- `create_milestone` - Create a milestone
- `list_milestones` - List milestones

### Client Management
- `create_client` - Create a new client
- `get_client` - Get client details
- `update_client` - Update a client
- `list_clients` - List all clients
- `create_proposal` - Create a proposal
- `list_proposals` - List proposals

### Workforce Management
- `create_team` - Create a new team
- `get_team` - Get team details
- `list_teams` - List all teams
- `add_team_member` - Add a member to a team
- `get_team_members` - Get team members
- `get_user_skills` - Get user skills
- `add_user_skill` - Add a user skill

### Communication
- `send_message` - Send a message to a channel
- `list_messages` - List messages in a channel
- `create_channel` - Create a new channel
- `list_channels` - List channels
- `create_announcement` - Create an announcement

### Notifications
- `send_notification` - Send a notification
- `list_notifications` - List user notifications
- `mark_notification_read` - Mark notification as read
- `send_bulk_notification` - Send notifications to multiple users

### Knowledge Hub
- `create_document` - Create a document
- `search_documents` - Search documents
- `create_wiki_page` - Create a wiki page

## How It Works

1. **Query Classification**: When a query comes in, the system determines if it's:
   - An **informational query** (e.g., "How many projects do I have?") → Uses RAG
   - An **action query** (e.g., "Create a new project") → Uses Agent

2. **RAG Pipeline**: For informational queries:
   - Searches the vector database for relevant documents
   - Builds context from organization data
   - Generates response using LLM with context

3. **Agent Pipeline**: For action queries:
   - Identifies required tools based on the query
   - Executes tools in sequence if needed
   - Returns results with action confirmation

4. **Service Communication**: Currently uses HTTP REST for service-to-service communication.
   - gRPC support is defined in `.proto` files for future implementation
   - Automatic fallback from gRPC to HTTP if gRPC is unavailable

## Configuration

### Environment Variables

```env
# AI/LLM Configuration
MISTRAL_API_KEY=your-api-key

# Service URLs (HTTP)
PROJECT_SERVICE_URL=http://localhost:3003
CLIENT_SERVICE_URL=http://localhost:3004
WORKFORCE_SERVICE_URL=http://localhost:3002
COMMUNICATION_SERVICE_URL=http://localhost:3006
NOTIFICATION_SERVICE_URL=http://localhost:3008
KNOWLEDGE_SERVICE_URL=http://localhost:3005

# gRPC Configuration (future)
USE_GRPC=false
PROJECT_GRPC_HOST=localhost
PROJECT_GRPC_PORT=50051
# ... etc
```

## Example Interactions

### Creating a Project
```
User: "Create a project called 'Mobile App Development' with a budget of $50,000"

AI: "I've created the project 'Mobile App Development' with the following details:
- Status: Planned
- Budget: $50,000
- Created: December 5, 2025

Would you like me to add tasks or milestones to this project?"
```

### Assigning a Task
```
User: "Create a task 'Design mockups' and assign it to John with high priority"

AI: "I've created and assigned the task:
- Title: Design mockups
- Assignee: John
- Priority: High
- Status: Todo

The task has been added to the current project."
```

### Querying Data
```
User: "How many tasks are overdue in my projects?"

AI: "Based on your organization data, you have 3 overdue tasks:
1. 'Review client feedback' - Due Dec 1 (Project: Website)
2. 'Update documentation' - Due Nov 28 (Project: API)  
3. 'Security audit' - Due Nov 25 (Project: Backend)

Would you like me to update the due dates or reassign any of these tasks?"
```
