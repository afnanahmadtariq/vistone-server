import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { config } from '../config/env';

let pineconeClient: Pinecone | null = null;

export async function initPinecone(): Promise<Pinecone> {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
  }
  return pineconeClient;
}

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    throw new Error('Pinecone client not initialized. Call initPinecone() first.');
  }
  return pineconeClient;
}

export async function getOrCreateIndex(dimension = 1024) {
  const pinecone = await initPinecone();
  const indexName = config.pinecone.indexName;
  
  // Check if index exists
  const indexes = await pinecone.listIndexes();
  const indexExists = indexes.indexes?.some((idx) => idx.name === indexName);

  if (!indexExists) {
    // Create the index if it doesn't exist
    await pinecone.createIndex({
      name: indexName,
      dimension, // Mistral embeddings dimension
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });

    // Wait for index to be ready
    console.log(`Creating Pinecone index: ${indexName}...`);
    await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 60 seconds for index creation
  }

  return pinecone.index(indexName);
}

export interface VectorMetadata {
  source: string;
  type: string;
  entityId: string;
  organizationId?: string;
  content: string;
  timestamp: string;
  additionalInfo?: Record<string, string | number | boolean>;
}

// Convert VectorMetadata to Pinecone RecordMetadata
export function toRecordMetadata(metadata: VectorMetadata): RecordMetadata {
  const result: RecordMetadata = {
    source: metadata.source,
    type: metadata.type,
    entityId: metadata.entityId,
    content: metadata.content,
    timestamp: metadata.timestamp,
  };
  
  if (metadata.organizationId) {
    result.organizationId = metadata.organizationId;
  }
  
  if (metadata.additionalInfo) {
    result.additionalInfo = JSON.stringify(metadata.additionalInfo);
  }
  
  return result;
}

// Convert Pinecone RecordMetadata back to VectorMetadata
export function fromRecordMetadata(metadata: RecordMetadata | undefined): VectorMetadata {
  if (!metadata) {
    return {
      source: '',
      type: '',
      entityId: '',
      content: '',
      timestamp: '',
    };
  }
  
  let additionalInfo: Record<string, string | number | boolean> | undefined;
  if (metadata.additionalInfo && typeof metadata.additionalInfo === 'string') {
    try {
      additionalInfo = JSON.parse(metadata.additionalInfo);
    } catch {
      additionalInfo = undefined;
    }
  }
  
  return {
    source: String(metadata.source || ''),
    type: String(metadata.type || ''),
    entityId: String(metadata.entityId || ''),
    organizationId: metadata.organizationId ? String(metadata.organizationId) : undefined,
    content: String(metadata.content || ''),
    timestamp: String(metadata.timestamp || ''),
    additionalInfo,
  };
}

export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata: VectorMetadata;
  }>,
  namespace?: string
) {
  const index = await getOrCreateIndex();
  const ns = namespace || config.pinecone.namespace;
  
  // Convert to Pinecone format
  const pineconeVectors = vectors.map((v) => ({
    id: v.id,
    values: v.values,
    metadata: toRecordMetadata(v.metadata),
  }));
  
  // Batch upsert (Pinecone recommends batches of 100)
  const batchSize = 100;
  for (let i = 0; i < pineconeVectors.length; i += batchSize) {
    const batch = pineconeVectors.slice(i, i + batchSize);
    await index.namespace(ns).upsert(batch);
  }
}

export async function queryVectors(
  queryVector: number[],
  topK = 5,
  filter?: Record<string, any>,
  namespace?: string
) {
  const index = await getOrCreateIndex();
  const ns = namespace || config.pinecone.namespace;

  const queryResponse = await index.namespace(ns).query({
    vector: queryVector,
    topK,
    includeMetadata: true,
    filter,
  });

  return queryResponse.matches || [];
}

export async function deleteVectors(ids: string[], namespace?: string) {
  const index = await getOrCreateIndex();
  const ns = namespace || config.pinecone.namespace;
  
  await index.namespace(ns).deleteMany(ids);
}

export async function deleteByFilter(filter: Record<string, any>, namespace?: string) {
  const index = await getOrCreateIndex();
  const ns = namespace || config.pinecone.namespace;
  
  await index.namespace(ns).deleteMany({ filter });
}
