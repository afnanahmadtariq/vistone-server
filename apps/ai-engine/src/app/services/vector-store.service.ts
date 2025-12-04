import { getPrismaClient } from '../lib/prisma';
import { embedText, formatEmbeddingForPg } from './embeddings.service';
import { ragConfig } from '../config';

export interface SimilarDocument {
  id: string;
  documentId: string;
  chunkText: string;
  title: string;
  contentType: string;
  sourceSchema: string;
  sourceTable: string;
  sourceId: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export interface VectorSearchOptions {
  organizationId: string;
  query: string;
  contentTypes?: string[];
  topK?: number;
  similarityThreshold?: number;
}

/**
 * Perform vector similarity search filtered by organization
 */
export async function searchSimilarDocuments(
  options: VectorSearchOptions
): Promise<SimilarDocument[]> {
  const prisma = getPrismaClient();
  const {
    organizationId,
    query,
    contentTypes,
    topK = ragConfig.vectorSearch.topK,
    similarityThreshold = ragConfig.vectorSearch.similarityThreshold,
  } = options;

  // Generate embedding for the query
  const queryEmbedding = await embedText(query);
  const embeddingStr = formatEmbeddingForPg(queryEmbedding);

  // Build content type filter
  const contentTypeFilter = contentTypes?.length
    ? `AND d."contentType" = ANY(ARRAY[${contentTypes.map(t => `'${t}'`).join(',')}])`
    : '';

  // Perform vector similarity search with organization filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: SimilarDocument[] = await (prisma as any).$queryRawUnsafe(`
    SELECT 
      e.id,
      e."documentId",
      e."chunkText",
      d.title,
      d."contentType",
      d."sourceSchema",
      d."sourceTable",
      d."sourceId",
      d.metadata,
      1 - (e.embedding <=> '${embeddingStr}'::vector) as similarity
    FROM ai_engine.rag_embeddings e
    JOIN ai_engine.rag_documents d ON e."documentId" = d.id
    WHERE d."organizationId" = $1
      ${contentTypeFilter}
      AND e.embedding IS NOT NULL
    ORDER BY e.embedding <=> '${embeddingStr}'::vector
    LIMIT $2
  `, organizationId, topK);

  // Filter by similarity threshold
  return results.filter((doc: SimilarDocument) => doc.similarity >= similarityThreshold);
}

/**
 * Build context from similar documents for LLM
 */
export function buildContextFromDocuments(
  documents: SimilarDocument[]
): string {
  if (documents.length === 0) {
    return 'No relevant information found in the organization\'s data.';
  }

  const contextParts = documents.map((doc, index) => {
    const metadata = doc.metadata as Record<string, unknown> | null;
    const metadataStr = metadata
      ? Object.entries(metadata)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
      : '';

    return `
[Source ${index + 1}] (${doc.contentType} - ${doc.sourceTable})
Title: ${doc.title}
${metadataStr ? `Metadata: ${metadataStr}` : ''}
Content: ${doc.chunkText}
---`;
  });

  return contextParts.join('\n');
}

/**
 * Get document by source reference
 */
export async function getDocumentBySource(
  sourceSchema: string,
  sourceTable: string,
  sourceId: string
): Promise<{ id: string; contentHash: string | null } | null> {
  const prisma = getPrismaClient();
  
  const doc = await prisma.ragDocument.findUnique({
    where: {
      sourceSchema_sourceTable_sourceId: {
        sourceSchema,
        sourceTable,
        sourceId,
      },
    },
    select: {
      id: true,
      contentHash: true,
    },
  });

  return doc;
}
