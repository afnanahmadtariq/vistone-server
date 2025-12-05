// Configuration for RAG and LLM services
export const ragConfig = {
  // Mistral API Configuration
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || '',
    embeddingModel: 'mistral-embed', // 1024 dimensions
    chatModel: 'mistral-large-latest', // Or 'mistral-medium', 'mistral-small'
    temperature: 0.3,
    maxTokens: 2048,
  },

  // Embedding Configuration
  embedding: {
    chunkSize: 1000, // Characters per chunk
    chunkOverlap: 200, // Overlap between chunks
    batchSize: 10, // Number of texts to embed in one API call
  },

  // Vector Search Configuration
  vectorSearch: {
    topK: 10, // Number of similar documents to retrieve
    similarityThreshold: 0.3, // Minimum similarity score (lowered for better recall)
  },

  // RAG Behavior
  rag: {
    // Content types that can be indexed
    allowedContentTypes: [
      'organization',
      'member',
      'project',
      'task',
      'milestone',
      'risk',
      'wiki',
      'document',
      'team',
      'user',
      'client',
      'proposal',
    ],
    
    // Maximum context length for LLM
    maxContextLength: 8000,
    
    // Include metadata in context
    includeMetadata: true,
  },

  // System prompt boundaries
  systemPrompt: {
    // Topics the AI should NOT respond to
    blockedTopics: [
      'politics',
      'religion',
      'personal advice',
      'medical advice',
      'legal advice',
      'financial investment advice',
    ],
    
    // The AI should only answer questions about:
    allowedDomains: [
      'project management',
      'task tracking',
      'team management',
      'client management',
      'documentation',
      'knowledge base',
      'workforce',
      'organization data',
      'deadlines',
      'risks',
      'milestones',
    ],
  },
};

export type RagConfig = typeof ragConfig;
