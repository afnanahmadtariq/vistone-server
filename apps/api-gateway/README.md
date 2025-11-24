# API Gateway

GraphQL API Gateway that proxies requests to backend REST services.

## Overview

This API Gateway receives GraphQL requests from the frontend and resolves them to REST endpoints in the backend services. The gateway and backend services are designed to be deployed on different servers.

## Architecture

```
Frontend (GraphQL Client)
        ↓
API Gateway (GraphQL Server - Port 4000)
        ↓
Backend Services (REST API - Port 3000)
        ↓
PostgreSQL Database
```

## Environment Configuration

Create a `.env` file in the api-gateway directory:

```env
# API Gateway Configuration
PORT=4000
HOST=localhost

# Backend Services URL (change this to your deployed backend URL)
BACKEND_SERVICES_URL=http://localhost:3000
```

For production deployment, set `BACKEND_SERVICES_URL` to your actual backend service URL:
```env
BACKEND_SERVICES_URL=https://api.yourbackend.com
```

## Running the API Gateway

### Development

```bash
# From the root directory
npx nx serve api-gateway

# Or using npm
npm run dev
```

### Production

```bash
# Build the project
npx nx build api-gateway

# Run the built application
node dist/apps/api-gateway/main.js
```

## GraphQL Endpoint

Once running, the GraphQL endpoint will be available at:
- **GraphQL Playground**: `http://localhost:4000/graphql`
- **Health Check**: `http://localhost:4000/health`

## Example GraphQL Queries

### Query Users
```graphql
query GetUsers {
  users {
    id
    email
    firstName
    lastName
    createdAt
  }
}
```

### Query Single User
```graphql
query GetUser {
  user(id: "user-id-here") {
    id
    email
    firstName
    lastName
  }
}
```

### Create User
```graphql
mutation CreateUser {
  createUser(input: {
    email: "user@example.com"
    firstName: "John"
    password: "hashedPassword123"
  }) {
    id
    email
    firstName
  }
}
```

### Query Projects
```graphql
query GetProjects {
  projects {
    id
    name
    description
    status
    startDate
    endDate
    budget
  }
}
```

### Create Project
```graphql
mutation CreateProject {
  createProject(input: {
    organizationId: "org-id"
    name: "New Project"
    description: "Project description"
    status: "active"
  }) {
    id
    name
    status
  }
}
```

### Query Tasks
```graphql
query GetTasks {
  tasks {
    id
    title
    description
    status
    priority
    dueDate
    projectId
    assigneeId
  }
}
```

## Available Entities

The API Gateway provides GraphQL access to all backend entities:

### User & Organization
- Users
- Organizations
- OrganizationMembers
- Roles
- KycData
- MfaSettings
- ActivityLogs

### Teams
- Teams
- TeamMembers
- UserSkills
- UserAvailability

### Projects
- Projects
- ProjectMembers
- Tasks
- TaskChecklists
- TaskDependencies
- Milestones
- RiskRegister

### Clients
- Clients
- ProjectClients
- ClientFeedback
- Proposals

### Documentation
- WikiPages
- WikiPageVersions
- DocumentFolders
- Documents
- DocumentPermissions
- DocumentLinks

### Communication
- ChatChannels
- ChannelMembers
- ChatMessages
- MessageMentions
- MessageAttachments
- CommunicationLogs

### AI & Automation
- AiConversations
- AiInsights
- AutomationRules
- AutomationLogs

### Monitoring
- KpiDefinitions
- KpiMeasurements
- ReportTemplates
- GeneratedReports
- MemberPerformance

### Notifications
- NotificationTemplates
- NotificationPreferences
- Notifications

### Dashboards
- Dashboards
- DashboardWidgets

## Features

- **GraphQL Schema**: Comprehensive schema covering all backend entities
- **Automatic Proxy**: All queries and mutations are automatically proxied to backend REST endpoints
- **Environment-based Configuration**: Backend URL configured via environment variables
- **Error Handling**: Centralized error handling and logging
- **Health Check**: Built-in health check endpoint
- **Type Safety**: Full TypeScript support

## Deployment

### Docker Deployment

The API Gateway can be deployed using Docker. Make sure to:

1. Set the `BACKEND_SERVICES_URL` environment variable to point to your deployed backend service
2. Expose the appropriate port (default: 4000)
3. Ensure network connectivity between the gateway and backend services

### Environment Variables for Production

```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
BACKEND_SERVICES_URL=https://your-backend-api.com
```

## Development Notes

- The gateway uses `axios` for HTTP communication with backend services
- All GraphQL types are automatically mapped to backend REST endpoints
- Custom scalars are provided for `DateTime` and `JSON` types
- The gateway is stateless and can be horizontally scaled
