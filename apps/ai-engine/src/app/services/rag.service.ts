/**
 * AI Engine — RAG Service (Lean)
 * Vector search, embedding, and context building.
 * ALL LangChain imports are lazy-loaded via dynamic import().
 */
import { config } from '../config';
import { query, getPrisma } from '../db';
import type { AuthenticatedUser, SourceReference } from '../types';
import { getReadableContentTypes } from './rbac.service';

// ── Lazy LangChain singletons ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingsInstance: any = null;

async function getEmbeddings() {
  if (!embeddingsInstance) {
    const { MistralAIEmbeddings } = await import('@langchain/mistralai');
    embeddingsInstance = new MistralAIEmbeddings({
      apiKey: config.mistral.apiKey,
      model: config.mistral.embedModel,
    });
  }
  return embeddingsInstance;
}

// ── Embed a query ───────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const embeddings = await getEmbeddings();
  return embeddings.embedQuery(text);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings = await getEmbeddings();
  const results: number[][] = [];
  const batchSize = config.embedding.batchSize;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await embeddings.embedDocuments(batch);
    results.push(...batchResults);
  }
  return results;
}

// ── Vector Search (RBAC-filtered) ───────────────────────────────

export interface SimilarDocument {
  documentId: string;
  chunkText: string;
  similarity: number;
  title: string;
  contentType: string;
  sourceId: string;
  sourceSchema: string;
  sourceTable: string;
  metadata: Record<string, unknown>;
}

/**
 * Search for similar documents, filtered by user's readable content types.
 */
export async function searchSimilar(
  user: AuthenticatedUser,
  queryText: string,
  topK?: number
): Promise<SimilarDocument[]> {
  const allowedTypes = getReadableContentTypes(user);
  if (allowedTypes.length === 0) return [];

  const queryEmbedding = await embedText(queryText);
  const k = topK || config.vectorSearch.topK;
  const threshold = config.vectorSearch.similarityThreshold;

  // Build parameterized content type placeholders
  const typePlaceholders = allowedTypes.map((_, i) => `$${i + 4}`).join(', ');

  const sql = `
    SELECT
      d.id AS "documentId",
      e."chunkText",
      1 - (e.embedding <=> $1::vector) AS similarity,
      d.title,
      d."contentType",
      d."sourceId",
      d."sourceSchema",
      d."sourceTable",
      d.metadata
    FROM ai_engine.rag_embeddings e
    JOIN ai_engine.rag_documents d ON d.id = e."documentId"
    WHERE d."organizationId" = $2
      AND d."contentType" IN (${typePlaceholders})
      AND 1 - (e.embedding <=> $1::vector) > $3
    ORDER BY similarity DESC
    LIMIT ${k}
  `;

  const params = [
    `[${queryEmbedding.join(',')}]`,
    user.organizationId,
    threshold,
    ...allowedTypes,
  ];

  const result = await query(sql, params);
  return result.rows as SimilarDocument[];
}

/**
 * Build context string from search results for the LLM prompt.
 */
export function buildContext(docs: SimilarDocument[], maxLen?: number): string {
  const max = maxLen || config.rag.maxContextLength;
  let context = '';

  for (const doc of docs) {
    const entry = `[${doc.contentType}] ${doc.title}:\n${doc.chunkText}\n\n`;
    if (context.length + entry.length > max) break;
    context += entry;
  }

  return context;
}

/**
 * Extract unique source references from search results.
 */
export function extractSources(docs: SimilarDocument[]): SourceReference[] {
  const seen = new Set<string>();
  const sources: SourceReference[] = [];

  for (const doc of docs) {
    const key = `${doc.sourceSchema}:${doc.sourceTable}:${doc.sourceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      contentType: doc.contentType,
      title: doc.title,
      sourceId: doc.sourceId,
    });
  }

  return sources;
}

// ── Conversation History ────────────────────────────────────────

export async function getConversationHistory(
  sessionId: string,
  limit?: number
): Promise<{ role: string; content: string }[]> {
  const prisma = await getPrisma();
  const max = limit || config.rag.maxConversationHistory;

  const history = await prisma.conversationHistory.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: max,
    select: { role: true, content: true },
  });

  return history.reverse();
}

export async function saveToHistory(
  organizationId: string,
  userId: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const prisma = await getPrisma();
  await prisma.conversationHistory.create({
    data: { organizationId, userId, sessionId, role, content, metadata },
  });
}

export async function clearHistory(sessionId: string): Promise<void> {
  const prisma = await getPrisma();
  await prisma.conversationHistory.deleteMany({
    where: { sessionId },
  });
}
