// Type definitions for the AI Engine

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface UserContext {
  userId: string;
  organizationId: string;
  organizationName?: string;
  permissions?: string[];
}

export interface ChatRequest {
  query: string;
  sessionId?: string;
  contentTypes?: ContentType[];
}

export type ContentType =
  | 'project'
  | 'task'
  | 'milestone'
  | 'wiki'
  | 'document'
  | 'team'
  | 'user'
  | 'client'
  | 'proposal';

export interface ChatResponse {
  answer: string;
  sessionId: string;
  isOutOfScope: boolean;
  sources: SourceReference[];
}

export interface SourceReference {
  contentType: ContentType;
  title: string;
  sourceId: string;
  similarity?: number;
}

export interface SyncStatus {
  type: string;
  synced: number;
  errors: string[];
  lastSyncedAt: Date;
}

export interface IndexingStats {
  totalDocuments: number;
  byContentType: Record<ContentType, number>;
  lastSyncedAt: Date | null;
}

// Webhook payload types for real-time sync
export interface WebhookPayload {
  event: 'create' | 'update' | 'delete';
  schema: string;
  table: string;
  record: {
    id: string;
    organizationId?: string;
    [key: string]: unknown;
  };
}

// RAG Configuration types
export interface RagSettings {
  enabled: boolean;
  allowedContentTypes: ContentType[];
  maxContextLength: number;
  similarityThreshold: number;
  topK: number;
}

// Error types
export class AIEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 500
  ) {
    super(message);
    this.name = 'AIEngineError';
  }
}

export class OutOfScopeError extends AIEngineError {
  constructor(message = 'Query is outside the allowed scope') {
    super(message, 'OUT_OF_SCOPE', 400);
    this.name = 'OutOfScopeError';
  }
}

export class EmbeddingError extends AIEngineError {
  constructor(message = 'Failed to generate embeddings') {
    super(message, 'EMBEDDING_ERROR', 500);
    this.name = 'EmbeddingError';
  }
}

export class VectorSearchError extends AIEngineError {
  constructor(message = 'Vector search failed') {
    super(message, 'VECTOR_SEARCH_ERROR', 500);
    this.name = 'VectorSearchError';
  }
}
