-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai_engine";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "ai_engine"."rag_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceSchema" TEXT NOT NULL,
    "sourceTable" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_engine"."rag_embeddings" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "chunkText" TEXT NOT NULL,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rag_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_engine"."conversation_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_engine"."system_prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_engine"."rag_access_control" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "contentType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rag_access_control_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rag_documents_organizationId_idx" ON "ai_engine"."rag_documents"("organizationId");

-- CreateIndex
CREATE INDEX "rag_documents_organizationId_contentType_idx" ON "ai_engine"."rag_documents"("organizationId", "contentType");

-- CreateIndex
CREATE UNIQUE INDEX "rag_documents_sourceSchema_sourceTable_sourceId_key" ON "ai_engine"."rag_documents"("sourceSchema", "sourceTable", "sourceId");

-- CreateIndex
CREATE INDEX "rag_embeddings_documentId_idx" ON "ai_engine"."rag_embeddings"("documentId");

-- CreateIndex
CREATE INDEX "conversation_history_organizationId_userId_idx" ON "ai_engine"."conversation_history"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "conversation_history_sessionId_idx" ON "ai_engine"."conversation_history"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "system_prompt_templates_name_key" ON "ai_engine"."system_prompt_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "rag_access_control_organizationId_contentType_key" ON "ai_engine"."rag_access_control"("organizationId", "contentType");

-- AddForeignKey
ALTER TABLE "ai_engine"."rag_embeddings" ADD CONSTRAINT "rag_embeddings_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ai_engine"."rag_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
