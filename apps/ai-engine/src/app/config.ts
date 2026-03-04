/**
 * AI Engine — Unified Configuration
 * All config in one place. No eager LLM/LangChain imports.
 */

export const config = {
    // ── Mistral AI ────────────────────────────────────────────────
    mistral: {
        apiKey: process.env.MISTRAL_API_KEY || '',
        chatModel: process.env.MISTRAL_CHAT_MODEL || 'mistral-large-latest',
        embedModel: process.env.MISTRAL_EMBED_MODEL || 'mistral-embed',
        temperature: parseFloat(process.env.MISTRAL_TEMPERATURE || '0.3'),
        maxTokens: parseInt(process.env.MISTRAL_MAX_TOKENS || '2048'),
    },

    // ── Embedding & Vector Search ─────────────────────────────────
    embedding: {
        dimension: 1024, // Mistral embed dimension
        batchSize: parseInt(process.env.EMBED_BATCH_SIZE || '10'),
    },
    vectorSearch: {
        topK: parseInt(process.env.VECTOR_TOP_K || '8'),
        similarityThreshold: parseFloat(process.env.VECTOR_SIMILARITY_THRESHOLD || '0.3'),
    },
    textSplitter: {
        chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
    },

    // ── RAG Behaviour ─────────────────────────────────────────────
    rag: {
        maxConversationHistory: parseInt(process.env.MAX_CONVERSATION_HISTORY || '10'),
        maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH || '6000'),
    },

    // ── Agent ─────────────────────────────────────────────────────
    agent: {
        maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '5'),
    },

    // ── Microservice URLs ─────────────────────────────────────────
    services: {
        auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        workforce: process.env.WORKFORCE_SERVICE_URL || 'http://localhost:3002',
        project: process.env.PROJECT_SERVICE_URL || 'http://localhost:3003',
        client: process.env.CLIENT_SERVICE_URL || 'http://localhost:3004',
        knowledge: process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:3005',
        communication: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3006',
        monitoring: process.env.MONITORING_SERVICE_URL || 'http://localhost:3007',
        notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
    },

    // ── Database ──────────────────────────────────────────────────
    db: {
        url: process.env.DATABASE_URL || '',
        pool: {
            max: parseInt(process.env.DB_POOL_MAX || '5'),
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
            connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000'),
        },
    },

    // ── System Prompt Boundaries ──────────────────────────────────
    blockedTopics: [
        'politics', 'religion', 'medical advice', 'legal advice',
        'personal opinions', 'controversial topics',
    ],
} as const;
