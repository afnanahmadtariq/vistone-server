# AI Engine - RAG-based Assistant

The AI Engine provides a Retrieval-Augmented Generation (RAG) system that allows users to query their organization's data using natural language.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Postgres Cluster                         │
├─────────────────────────────────────────────────────────────┤
│  ├── auth (users, organizations, roles)                     │
│  ├── project (projects, tasks, milestones)                  │
│  ├── knowledge (wiki, documents)                            │
│  ├── workforce (teams, skills)                              │
│  ├── client (clients, proposals)                            │
│  └── ai_engine                                               │
│       ├── rag_documents (metadata + content)                │
│       ├── rag_embeddings (pgvector - 1024 dims)             │
│       ├── conversation_history                               │
│       └── system_prompt_templates                           │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Multi-tenant RAG**: Each organization's data is isolated
- **Semantic Search**: Using pgvector for similarity search
- **LLM Integration**: Mistral API for embeddings and chat
- **Conversation History**: Maintains context across messages
- **Content Filtering**: Only responds to system-related queries
- **Real-time Indexing**: Webhook support for instant updates

## Tech Stack

- **LangChain TypeScript**: For RAG orchestration
- **Mistral AI**: Embeddings (`mistral-embed`) and Chat (`mistral-large-latest`)
- **pgvector**: Vector similarity search in PostgreSQL
- **Fastify**: Fast, low-overhead web framework

## Setup

### 1. Environment Variables

Add to your `.env`:

```bash
AI_ENGINE_PORT=3009
MISTRAL_API_KEY="your-mistral-api-key"
DATABASE_URL="your-neon-postgres-url"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Database Migration

```bash
# Apply the migration
psql $DATABASE_URL -f apps/ai-engine/prisma/migrations/001_init_ai_engine.sql
```

Or use the Prisma schema:

```bash
cd apps/ai-engine
npx prisma db push
```

### 4. Generate Prisma Client

```bash
npx prisma generate --schema=apps/ai-engine/prisma/schema.prisma
```

### 5. Start the Service

```bash
nx serve ai-engine
```

## API Endpoints

### Chat

**POST /api/chat**

Query the RAG system with natural language.

```json
{
  "organizationId": "org-123",
  "organizationName": "Acme Corp",
  "userId": "user-456",
  "sessionId": "session-789",
  "query": "What projects are currently in progress?",
  "contentTypes": ["project", "task"]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "answer": "Based on your organization's data, there are 3 projects currently in progress...",
    "sessionId": "session-789",
    "isOutOfScope": false,
    "sources": [
      {
        "contentType": "project",
        "title": "Website Redesign",
        "sourceId": "proj-123"
      }
    ]
  }
}
```

### Clear History

**DELETE /api/chat/history/:sessionId**

Clear conversation history for a session.

### Get Stats

**GET /api/chat/stats/:organizationId**

Get indexing statistics for an organization.

### Sync Data

**POST /api/sync/all**

Sync all organization data to the RAG index.

```json
{
  "organizationId": "org-123"
}
```

**POST /api/sync/:type**

Sync specific data type (`projects`, `tasks`, `milestones`, `wiki`, `documents`, `teams`, `clients`, `proposals`).

### Index Document

**POST /api/index/document**

Index a single document (for real-time updates).

```json
{
  "organizationId": "org-123",
  "sourceSchema": "project",
  "sourceTable": "tasks",
  "sourceId": "task-456",
  "title": "Implement login feature",
  "content": "Create the login page with email/password authentication",
  "contentType": "task",
  "metadata": {
    "status": "in_progress",
    "priority": "high"
  }
}
```

### Remove Document

**DELETE /api/index/document**

Remove a document from the index.

## Security Considerations

1. **Organization Isolation**: All queries are filtered by `organizationId`
2. **Content Filtering**: The LLM only answers questions about allowed domains
3. **Blocked Topics**: Political, religious, medical, legal, and financial advice queries are rejected
4. **No Data Hallucination**: The LLM is instructed to only use provided context

## Embedding Dimensions

- **Model**: `mistral-embed`
- **Dimensions**: 1024
- **Index**: HNSW (Hierarchical Navigable Small World) for fast similarity search

## Performance Tips

1. **Chunk Size**: Default 1000 characters with 200 overlap
2. **Top-K**: Default 5 documents retrieved
3. **Similarity Threshold**: Default 0.7 (70% similarity)
4. **Batch Embedding**: Process 10 texts per API call

## Development

### Run Tests

```bash
nx test ai-engine
```

### Lint

```bash
nx lint ai-engine
```

### Build

```bash
nx build ai-engine
```
