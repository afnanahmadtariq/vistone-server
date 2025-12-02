export const config = {
  // Mistral AI Configuration
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || '',
    model: process.env.MISTRAL_MODEL || 'open-mixtral-8x7b',
    embeddingModel: process.env.MISTRAL_EMBEDDING_MODEL || 'mistral-embed',
  },

  // Pinecone Configuration
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX_NAME || 'vistone-knowledge',
    namespace: process.env.PINECONE_NAMESPACE || 'default',
  },

  // gRPC Service Ports
  grpc: {
    authService: process.env.AUTH_GRPC_PORT || '50051',
    workforceService: process.env.WORKFORCE_GRPC_PORT || '50052',
    projectService: process.env.PROJECT_GRPC_PORT || '50053',
    clientService: process.env.CLIENT_GRPC_PORT || '50054',
    knowledgeService: process.env.KNOWLEDGE_GRPC_PORT || '50055',
    communicationService: process.env.COMMUNICATION_GRPC_PORT || '50056',
    monitoringService: process.env.MONITORING_GRPC_PORT || '50057',
    notificationService: process.env.NOTIFICATION_GRPC_PORT || '50058',
  },

  // AI Engine Configuration
  ai: {
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    topK: parseInt(process.env.AI_TOP_K || '5', 10),
    chunkSize: parseInt(process.env.AI_CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.AI_CHUNK_OVERLAP || '200', 10),
  },

  // Database (for fetching data to embed)
  database: {
    url: process.env.DATABASE_URL || '',
  },
};
