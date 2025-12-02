import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding, generateEmbeddings } from './mistral';
import { upsertVectors, queryVectors, deleteVectors, VectorMetadata, fromRecordMetadata } from './pinecone';
import { config } from '../config/env';

// Document interface for embedding
export interface DocumentChunk {
  id?: string;
  content: string;
  metadata: Omit<VectorMetadata, 'content' | 'timestamp'>;
}

// Text splitter for chunking documents
export function splitText(text: string, chunkSize: number = config.ai.chunkSize, overlap: number = config.ai.chunkOverlap): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to break at sentence or word boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const lastSpace = chunk.lastIndexOf(' ');
      
      const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace);
      if (breakPoint > chunkSize * 0.5) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    chunks.push(chunk.trim());
    start += chunk.length - overlap;
    if (start <= 0) start = chunk.length;
  }

  return chunks.filter((c) => c.length > 0);
}

// Embed and store documents
export async function embedDocuments(documents: DocumentChunk[]): Promise<void> {
  if (documents.length === 0) return;

  const contents = documents.map((doc) => doc.content);
  const embeddings = await generateEmbeddings(contents);

  const vectors = documents.map((doc, index) => ({
    id: doc.id || uuidv4(),
    values: embeddings[index],
    metadata: {
      ...doc.metadata,
      content: doc.content,
      timestamp: new Date().toISOString(),
    } as VectorMetadata,
  }));

  await upsertVectors(vectors);
}

// Embed and store a single document (with chunking)
export async function embedDocument(
  content: string,
  metadata: Omit<VectorMetadata, 'content' | 'timestamp'>
): Promise<string[]> {
  const chunks = splitText(content);
  const ids: string[] = [];

  const documents: DocumentChunk[] = chunks.map((chunk, index) => {
    const id = `${metadata.entityId}-chunk-${index}`;
    ids.push(id);
    
    const existingAdditionalInfo = metadata.additionalInfo || {};
    
    return {
      id,
      content: chunk,
      metadata: {
        ...metadata,
        additionalInfo: {
          ...existingAdditionalInfo,
          chunkIndex: index,
          totalChunks: chunks.length,
        },
      },
    };
  });

  await embedDocuments(documents);
  return ids;
}

// Query similar documents
export async function querySimilarDocuments(
  query: string,
  topK: number = config.ai.topK,
  filter?: Record<string, any>
): Promise<Array<{ content: string; metadata: VectorMetadata; score: number }>> {
  const queryVector = await generateEmbedding(query);
  const matches = await queryVectors(queryVector, topK, filter);

  return matches.map((match) => {
    const metadata = fromRecordMetadata(match.metadata);
    return {
      content: metadata.content,
      metadata,
      score: match.score || 0,
    };
  });
}

// Delete document embeddings
export async function deleteDocumentEmbeddings(entityId: string): Promise<void> {
  // Delete all chunks associated with this entity
  // We'll need to query first to find all chunk IDs
  const chunkIds: string[] = [];
  for (let i = 0; i < 100; i++) {
    chunkIds.push(`${entityId}-chunk-${i}`);
  }
  
  try {
    await deleteVectors(chunkIds);
  } catch (error) {
    console.error('Error deleting document embeddings:', error);
  }
}

// Format retrieved context for LLM
export function formatRetrievedContext(
  documents: Array<{ content: string; metadata: VectorMetadata; score: number }>
): string {
  if (documents.length === 0) {
    return 'No relevant context found.';
  }

  return documents
    .map((doc, index) => {
      const typeLabel = doc.metadata.type.charAt(0).toUpperCase() + doc.metadata.type.slice(1);
      const source = doc.metadata.source;
      return `[${index + 1}] ${typeLabel} (${source}, relevance: ${(doc.score * 100).toFixed(1)}%):\n${doc.content}`;
    })
    .join('\n\n---\n\n');
}
