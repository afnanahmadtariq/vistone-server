import { getPrismaClient } from '../lib/prisma';
import { embedTexts, formatEmbeddingForPg } from './embeddings.service';
import { splitText, createContentHash, prepareDocumentContent } from './text-splitter.service';

export interface DocumentToIndex {
  organizationId: string;
  sourceSchema: string;
  sourceTable: string;
  sourceId: string;
  title: string;
  content: string;
  contentType: string;
  metadata?: Record<string, unknown>;
}

export interface IndexingResult {
  documentId: string;
  chunksCreated: number;
  isNew: boolean;
  isUpdated: boolean;
}

/**
 * Index a document with embeddings
 */
export async function indexDocument(doc: DocumentToIndex): Promise<IndexingResult> {
  const prisma = getPrismaClient();
  
  // Prepare content for indexing
  const fullContent = prepareDocumentContent(doc.title, doc.content, doc.metadata);
  const contentHash = createContentHash(fullContent);

  // Check if document already exists
  const existingDoc = await prisma.ragDocument.findUnique({
    where: {
      sourceSchema_sourceTable_sourceId: {
        sourceSchema: doc.sourceSchema,
        sourceTable: doc.sourceTable,
        sourceId: doc.sourceId,
      },
    },
    select: { id: true, contentHash: true },
  });

  // If content hasn't changed, skip re-indexing
  if (existingDoc && existingDoc.contentHash === contentHash) {
    return {
      documentId: existingDoc.id,
      chunksCreated: 0,
      isNew: false,
      isUpdated: false,
    };
  }

  // Split content into chunks
  const chunks = await splitText(fullContent);
  
  // Generate embeddings for all chunks
  const embeddings = await embedTexts(chunks);

  // Use transaction to ensure consistency
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await prisma.$transaction(async (tx: any) => {
    let documentId: string;
    let isNew = false;

    if (existingDoc) {
      // Update existing document
      await tx.ragDocument.update({
        where: { id: existingDoc.id },
        data: {
          title: doc.title,
          content: doc.content,
          contentType: doc.contentType,
          metadata: doc.metadata ?? undefined,
          contentHash,
          lastSyncedAt: new Date(),
        },
      });
      documentId = existingDoc.id;

      // Delete old embeddings
      await tx.ragEmbedding.deleteMany({
        where: { documentId },
      });
    } else {
      // Create new document
      const newDoc = await tx.ragDocument.create({
        data: {
          organizationId: doc.organizationId,
          sourceSchema: doc.sourceSchema,
          sourceTable: doc.sourceTable,
          sourceId: doc.sourceId,
          title: doc.title,
          content: doc.content,
          contentType: doc.contentType,
          metadata: doc.metadata ?? undefined,
          contentHash,
        },
      });
      documentId = newDoc.id;
      isNew = true;
    }

    // Insert new embeddings using raw SQL for vector type
    for (let i = 0; i < chunks.length; i++) {
      const embeddingStr = formatEmbeddingForPg(embeddings[i]);
      await tx.$executeRawUnsafe(`
        INSERT INTO ai_engine.rag_embeddings (id, "documentId", "chunkIndex", "chunkText", embedding, "createdAt")
        VALUES (gen_random_uuid(), $1, $2, $3, '${embeddingStr}'::vector, NOW())
      `, documentId, i, chunks[i]);
    }

    return { documentId, chunksCreated: chunks.length, isNew };
  });

  return {
    ...result,
    isUpdated: !result.isNew && existingDoc !== null,
  };
}

/**
 * Bulk index multiple documents
 */
export async function indexDocuments(
  docs: DocumentToIndex[]
): Promise<{ indexed: number; skipped: number; errors: string[] }> {
  let indexed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const doc of docs) {
    try {
      const result = await indexDocument(doc);
      if (result.isNew || result.isUpdated) {
        indexed++;
      } else {
        skipped++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Failed to index ${doc.sourceTable}/${doc.sourceId}: ${errorMsg}`);
    }
  }

  return { indexed, skipped, errors };
}

/**
 * Remove a document and its embeddings
 */
export async function removeDocument(
  sourceSchema: string,
  sourceTable: string,
  sourceId: string
): Promise<boolean> {
  const prisma = getPrismaClient();

  const doc = await prisma.ragDocument.findUnique({
    where: {
      sourceSchema_sourceTable_sourceId: {
        sourceSchema,
        sourceTable,
        sourceId,
      },
    },
  });

  if (!doc) {
    return false;
  }

  // Cascade delete will remove embeddings
  await prisma.ragDocument.delete({
    where: { id: doc.id },
  });

  return true;
}

/**
 * Remove all documents for an organization
 */
export async function removeOrganizationDocuments(
  organizationId: string
): Promise<number> {
  const prisma = getPrismaClient();

  const result = await prisma.ragDocument.deleteMany({
    where: { organizationId },
  });

  return result.count;
}

/**
 * Get indexing statistics for an organization
 */
export async function getIndexingStats(organizationId: string): Promise<{
  totalDocuments: number;
  byContentType: Record<string, number>;
  lastSyncedAt: Date | null;
}> {
  const prisma = getPrismaClient();

  const [totalDocs, byType, lastSync] = await Promise.all([
    prisma.ragDocument.count({
      where: { organizationId },
    }),
    prisma.ragDocument.groupBy({
      by: ['contentType'],
      where: { organizationId },
      _count: true,
    }),
    prisma.ragDocument.findFirst({
      where: { organizationId },
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    }),
  ]);

  const byContentType: Record<string, number> = {};
  for (const item of byType) {
    byContentType[item.contentType] = item._count;
  }

  return {
    totalDocuments: totalDocs,
    byContentType,
    lastSyncedAt: lastSync?.lastSyncedAt ?? null,
  };
}
