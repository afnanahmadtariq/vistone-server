import { ChatMistralAI, MistralAIEmbeddings } from '@langchain/mistralai';
import { config } from '../config/env';

let mistralLLM: ChatMistralAI | null = null;
let mistralEmbeddings: MistralAIEmbeddings | null = null;

export function getMistralLLM(): ChatMistralAI {
  if (!mistralLLM) {
    mistralLLM = new ChatMistralAI({
      apiKey: config.mistral.apiKey,
      model: config.mistral.model,
      temperature: config.ai.temperature,
      maxTokens: config.ai.maxTokens,
    });
  }
  return mistralLLM;
}

export function getMistralEmbeddings(): MistralAIEmbeddings {
  if (!mistralEmbeddings) {
    mistralEmbeddings = new MistralAIEmbeddings({
      apiKey: config.mistral.apiKey,
      model: config.mistral.embeddingModel,
    });
  }
  return mistralEmbeddings;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = getMistralEmbeddings();
  const vector = await embeddings.embedQuery(text);
  return vector;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = getMistralEmbeddings();
  const vectors = await embeddings.embedDocuments(texts);
  return vectors;
}
