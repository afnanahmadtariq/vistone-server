-- AI Engine Schema Migration
-- Run this after enabling pgvector extension

-- Create the ai_engine schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS ai_engine;

-- Enable pgvector extension (should already be enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG Documents table - stores metadata about indexed documents
CREATE TABLE IF NOT EXISTS ai_engine.rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    
    -- Source reference
    "sourceSchema" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    
    -- Document metadata
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    metadata JSONB,
    
    -- Sync tracking
    "lastSyncedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "contentHash" TEXT,
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE ("sourceSchema", "sourceTable", "sourceId")
);

-- Indexes for rag_documents
CREATE INDEX IF NOT EXISTS idx_rag_documents_org ON ai_engine.rag_documents ("organizationId");
CREATE INDEX IF NOT EXISTS idx_rag_documents_org_type ON ai_engine.rag_documents ("organizationId", "contentType");

-- RAG Embeddings table - stores vector embeddings
CREATE TABLE IF NOT EXISTS ai_engine.rag_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL REFERENCES ai_engine.rag_documents(id) ON DELETE CASCADE,
    "chunkIndex" INTEGER DEFAULT 0,
    "chunkText" TEXT NOT NULL,
    embedding vector(1024), -- Mistral embedding dimension
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for rag_embeddings
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_doc ON ai_engine.rag_embeddings ("documentId");

-- Create HNSW index for fast vector similarity search
-- This index type is optimized for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector ON ai_engine.rag_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Conversation History table
CREATE TABLE IF NOT EXISTS ai_engine.conversation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversation_history
CREATE INDEX IF NOT EXISTS idx_conv_history_org_user ON ai_engine.conversation_history ("organizationId", "userId");
CREATE INDEX IF NOT EXISTS idx_conv_history_session ON ai_engine.conversation_history ("sessionId");

-- System Prompt Templates table
CREATE TABLE IF NOT EXISTS ai_engine.system_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    template TEXT NOT NULL,
    category TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RAG Access Control table
CREATE TABLE IF NOT EXISTS ai_engine.rag_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organizationId" TEXT,
    "contentType" TEXT NOT NULL,
    "isEnabled" BOOLEAN DEFAULT true,
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE ("organizationId", "contentType")
);

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION ai_engine.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updatedAt
DROP TRIGGER IF EXISTS update_rag_documents_updated_at ON ai_engine.rag_documents;
CREATE TRIGGER update_rag_documents_updated_at
    BEFORE UPDATE ON ai_engine.rag_documents
    FOR EACH ROW
    EXECUTE FUNCTION ai_engine.update_updated_at();

DROP TRIGGER IF EXISTS update_system_prompt_templates_updated_at ON ai_engine.system_prompt_templates;
CREATE TRIGGER update_system_prompt_templates_updated_at
    BEFORE UPDATE ON ai_engine.system_prompt_templates
    FOR EACH ROW
    EXECUTE FUNCTION ai_engine.update_updated_at();

DROP TRIGGER IF EXISTS update_rag_access_control_updated_at ON ai_engine.rag_access_control;
CREATE TRIGGER update_rag_access_control_updated_at
    BEFORE UPDATE ON ai_engine.rag_access_control
    FOR EACH ROW
    EXECUTE FUNCTION ai_engine.update_updated_at();

-- Insert default system prompt template
INSERT INTO ai_engine.system_prompt_templates (name, template, category)
VALUES (
    'default_rag',
    'You are an AI assistant for Vistone project management platform. Answer questions based on the provided context about the user''s organization data.',
    'general'
) ON CONFLICT (name) DO NOTHING;

-- Insert default access control settings
INSERT INTO ai_engine.rag_access_control ("organizationId", "contentType", "isEnabled")
VALUES 
    (NULL, 'project', true),
    (NULL, 'task', true),
    (NULL, 'milestone', true),
    (NULL, 'wiki', true),
    (NULL, 'document', true),
    (NULL, 'team', true),
    (NULL, 'client', true),
    (NULL, 'proposal', true)
ON CONFLICT ("organizationId", "contentType") DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON SCHEMA ai_engine TO your_app_user;
-- GRANT ALL ON ALL TABLES IN SCHEMA ai_engine TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA ai_engine TO your_app_user;

COMMENT ON SCHEMA ai_engine IS 'AI Engine schema for RAG and vector embeddings';
COMMENT ON TABLE ai_engine.rag_documents IS 'Stores metadata about documents indexed for RAG retrieval';
COMMENT ON TABLE ai_engine.rag_embeddings IS 'Stores vector embeddings for semantic search';
COMMENT ON TABLE ai_engine.conversation_history IS 'Stores chat history for context in conversations';
