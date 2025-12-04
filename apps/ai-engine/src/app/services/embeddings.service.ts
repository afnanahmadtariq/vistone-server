import { MistralAIEmbeddings } from '@langchain/mistralai';
import { ragConfig } from '../config';

let embeddingsInstance: MistralAIEmbeddings | null = null;

/**
 * Get the Mistral embeddings instance (singleton)
 */
export function getEmbeddingsModel(): MistralAIEmbeddings {
  if (!embeddingsInstance) {
    if (!ragConfig.mistral.apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }

    embeddingsInstance = new MistralAIEmbeddings({
      apiKey: ragConfig.mistral.apiKey,
      model: ragConfig.mistral.embeddingModel,
    });
  }
  return embeddingsInstance;
}

/**
 * Generate embeddings for a single text
 */
export async function embedText(text: string): Promise<number[]> {
  const model = getEmbeddingsModel();
  return model.embedQuery(text);
}

/**
 * Generate embeddings for multiple texts
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingsModel();
  
  // Process in batches to avoid rate limits
  const batchSize = ragConfig.embedding.batchSize;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await model.embedDocuments(batch);
    embeddings.push(...batchEmbeddings);
  }
  
  return embeddings;
}

/**
 * Format embedding array as PostgreSQL vector string
 */
export function formatEmbeddingForPg(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
