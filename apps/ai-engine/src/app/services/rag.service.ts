import { ChatMistralAI } from '@langchain/mistralai';
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from '@langchain/core/messages';
import { ragConfig } from '../config';
import { searchSimilarDocuments, buildContextFromDocuments, type SimilarDocument } from './vector-store.service';
import { getPrismaClient } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

let chatModelInstance: ChatMistralAI | null = null;

/**
 * Get the Mistral chat model instance (singleton)
 */
function getChatModel(): ChatMistralAI {
  if (!chatModelInstance) {
    if (!ragConfig.mistral.apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }

    chatModelInstance = new ChatMistralAI({
      apiKey: ragConfig.mistral.apiKey,
      model: ragConfig.mistral.chatModel,
      temperature: ragConfig.mistral.temperature,
      maxTokens: ragConfig.mistral.maxTokens,
    });
  }
  return chatModelInstance;
}

/**
 * Build the system prompt that restricts AI behavior
 */
function buildSystemPrompt(organizationName?: string): string {
  const allowedDomains = ragConfig.systemPrompt.allowedDomains.join(', ');
  const blockedTopics = ragConfig.systemPrompt.blockedTopics.join(', ');

  return `You are an AI assistant for Vistone, a project management and workforce management platform.
${organizationName ? `You are currently helping a member of the organization: "${organizationName}".` : ''}

IMPORTANT RULES:
1. You MUST only answer questions related to: ${allowedDomains}.
2. You MUST NOT discuss topics like: ${blockedTopics}.
3. You can ONLY use information from the provided context to answer questions about the organization's data.
4. If the user asks about data not in the context, politely say you don't have that information available.
5. If the user asks about topics outside your allowed domains, politely redirect them to ask about their projects, tasks, or organization data.
6. Always cite which source you're using when referencing specific data.
7. Be helpful, concise, and professional.
8. If you're unsure about something, say so rather than making up information.

When answering:
- Reference specific projects, tasks, or documents by name when available
- Provide actionable insights when possible
- Format responses clearly with bullet points or numbered lists when appropriate`;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RagQueryOptions {
  organizationId: string;
  organizationName?: string;
  userId: string;
  sessionId?: string;
  query: string;
  contentTypes?: string[];
  includeHistory?: boolean;
  maxHistoryMessages?: number;
}

export interface RagResponse {
  answer: string;
  sources: SimilarDocument[];
  sessionId: string;
  isOutOfScope: boolean;
}

/**
 * Check if query is within allowed scope
 */
function isQueryInScope(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Check for blocked topics
  const blockedPatterns = [
    /politic/i,
    /religion/i,
    /medical advice/i,
    /legal advice/i,
    /investment advice/i,
    /stock/i,
    /crypto/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(lowerQuery)) {
      return false;
    }
  }

  return true;
}

/**
 * Get conversation history for a session
 */
async function getConversationHistory(
  sessionId: string,
  maxMessages = 10
): Promise<ChatMessage[]> {
  const prisma = getPrismaClient();
  
  const history = await prisma.conversationHistory.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: maxMessages,
    select: {
      role: true,
      content: true,
    },
  });

  return history.reverse() as ChatMessage[];
}

/**
 * Save message to conversation history
 */
async function saveToHistory(
  organizationId: string,
  userId: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const prisma = getPrismaClient();
  
  await prisma.conversationHistory.create({
    data: {
      organizationId,
      userId,
      sessionId,
      role,
      content,
      metadata: metadata ?? undefined,
    },
  });
}

/**
 * Main RAG query function
 */
export async function queryWithRag(options: RagQueryOptions): Promise<RagResponse> {
  const {
    organizationId,
    organizationName,
    userId,
    query,
    contentTypes,
    includeHistory = true,
    maxHistoryMessages = 6,
  } = options;

  const sessionId = options.sessionId || uuidv4();

  // Check if query is in scope
  if (!isQueryInScope(query)) {
    return {
      answer: "I'm sorry, but I can only help with questions related to your projects, tasks, team, and organization data. Is there anything about your work I can help you with?",
      sources: [],
      sessionId,
      isOutOfScope: true,
    };
  }

  // Search for relevant documents
  const similarDocs = await searchSimilarDocuments({
    organizationId,
    query,
    contentTypes,
    topK: ragConfig.vectorSearch.topK,
  });

  // Build context from documents
  const context = buildContextFromDocuments(similarDocs);

  // Get conversation history if enabled
  let history: ChatMessage[] = [];
  if (includeHistory) {
    history = await getConversationHistory(sessionId, maxHistoryMessages);
  }

  // Save user message to history
  await saveToHistory(organizationId, userId, sessionId, 'user', query);

  // Build messages for LLM
  const messages: BaseMessage[] = [
    new SystemMessage(buildSystemPrompt(organizationName)),
  ];

  // Add conversation history
  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  // Add context and current query
  const contextualQuery = `
Based on the following context from the organization's data, please answer the user's question.

CONTEXT:
${context}

USER QUESTION: ${query}

Remember to only use information from the provided context. If the information is not available, say so.`;

  messages.push(new HumanMessage(contextualQuery));

  // Get response from LLM
  const chatModel = getChatModel();
  const response = await chatModel.invoke(messages);

  const answer = typeof response.content === 'string' 
    ? response.content 
    : JSON.stringify(response.content);

  // Save assistant response to history
  await saveToHistory(
    organizationId,
    userId,
    sessionId,
    'assistant',
    answer,
    { sources: similarDocs.map(d => ({ id: d.sourceId, type: d.contentType })) }
  );

  return {
    answer,
    sources: similarDocs,
    sessionId,
    isOutOfScope: false,
  };
}

/**
 * Clear conversation history for a session
 */
export async function clearConversationHistory(sessionId: string): Promise<void> {
  const prisma = getPrismaClient();
  
  await prisma.conversationHistory.deleteMany({
    where: { sessionId },
  });
}
