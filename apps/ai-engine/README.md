# AI Engine

> **Port:** `3009` | **Framework:** Fastify | **DB Schema:** `ai_engine`

---

## Overview

The AI Engine powers the platform's intelligent features through a **RAG (Retrieval-Augmented Generation)** pipeline. It indexes data from all other microservices, generates vector embeddings using Mistral AI, and provides context-aware chat and agentic capabilities using LangChain.

## Architecture

```
Data Sources (all services) → Data Sync → Text Splitting → Embeddings → pgvector
                                                                           ↓
                        User Query → RAG Service → Context Retrieval → LLM → Response
```

## Database Schema

**Prisma Schema:** `prisma/schema.prisma`

> Uses the `vector` PostgreSQL extension for 1024-dimension embeddings.

### Models

| Model                | Table                               | Key Fields                                                                |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| RagDocument          | `ai_engine.rag_documents`           | organizationId, sourceSchema, sourceTable, sourceId, content, contentType |
| RagEmbedding         | `ai_engine.rag_embeddings`          | documentId, chunkIndex, chunkText, embedding (vector 1024)                |
| ConversationHistory  | `ai_engine.conversation_history`    | organizationId, userId, sessionId, role, content                          |
| SystemPromptTemplate | `ai_engine.system_prompt_templates` | name, template, category, isActive                                        |
| RagAccessControl     | `ai_engine.rag_access_control`      | organizationId, contentType, isEnabled                                    |

## Implemented Features

### Routes

| Route            | Description                                   |
| ---------------- | --------------------------------------------- |
| Root (`/`)       | Health check and service info                 |
| Chat (`/chat`)   | RAG-powered conversational AI                 |
| Sync (`/sync`)   | Data synchronization from other microservices |
| Agent (`/agent`) | Agentic AI with action execution capabilities |

### Services

| Service         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `data-sync`     | Syncs data from all microservices into RAG documents |
| `embeddings`    | Generates Mistral AI embeddings (1024-dim vectors)   |
| `enhanced-rag`  | Enhanced RAG with advanced retrieval strategies      |
| `indexing`      | Document chunking and indexing pipeline              |
| `rag`           | Core RAG query and response generation               |
| `text-splitter` | Intelligent text chunking for embedding              |
| `user-context`  | User context management for personalized responses   |
| `vector-store`  | pgvector operations (store, search, similarity)      |

### Plugins

| Plugin     | Description               |
| ---------- | ------------------------- |
| `auth`     | Authentication middleware |
| `sensible` | Fastify sensible defaults |

### Key Capabilities

| Capability                      | Status |
| ------------------------------- | ------ |
| RAG pipeline (index + query)    | ✅     |
| Mistral embeddings (1024-dim)   | ✅     |
| pgvector similarity search      | ✅     |
| Multi-service data sync         | ✅     |
| Conversation history tracking   | ✅     |
| System prompt templates         | ✅     |
| Per-org access control          | ✅     |
| Content change detection (hash) | ✅     |
| Agent mode (NL → actions)       | ✅     |
| Text chunking strategies        | ✅     |
| User context awareness          | ✅     |

## Tech Stack

| Component  | Technology               |
| ---------- | ------------------------ |
| Framework  | Fastify 5                |
| LLM        | Mistral AI via LangChain |
| Embeddings | Mistral (1024-dim)       |
| Vector DB  | pgvector (PostgreSQL)    |
| ORM        | Prisma                   |

## Running

```bash
npx nx serve ai-engine
```

## Testing

```bash
npx nx test ai-engine
npx nx e2e ai-engine-e2e
```
