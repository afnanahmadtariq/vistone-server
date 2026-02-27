import { ChatMistralAI } from '@langchain/mistralai';
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from '@langchain/core/messages';
import { ragConfig } from '../config';
import { searchSimilarDocuments, buildContextFromDocuments, getOrganizationOverview, type SimilarDocument } from './vector-store.service';
import { getUserContext, formatUserContextForPrompt, type UserContext } from './user-context.service';
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
function buildSystemPrompt(organizationName?: string, userContext?: UserContext | null): string {
  const allowedDomains = ragConfig.systemPrompt.allowedDomains.join(', ');
  const blockedTopics = ragConfig.systemPrompt.blockedTopics.join(', ');

  // Build user context section if available
  let userContextSection = '';
  if (userContext) {
    userContextSection = `

${formatUserContextForPrompt(userContext)}

IMPORTANT: When the user asks about themselves (e.g., "who am I?", "do you know me?", "what are my tasks?", "how many clients do I have?"), 
use the CURRENT USER FACTS above to provide accurate, personalized responses. These are verified facts about the current user.
`;
  }

  return `You are an AI assistant for Vistone, a project management and workforce management platform.
${organizationName ? `You are currently helping a member of the organization: "${organizationName}".` : ''}
${userContextSection}
You have access to the full context of the organization including:
- Organization overview with statistics (projects count, tasks, members, teams, clients)
- All projects with their details (status, progress, deadlines, budgets)
- All tasks with their priorities, due dates, and assignments
- Team members and their roles
- Milestones and their status
- Risk registers for projects
- Clients and proposals
- Documents and wiki pages

IMPORTANT RULES:
1. You MUST only answer questions related to: ${allowedDomains}.
2. You MUST NOT discuss topics like: ${blockedTopics}.
3. You can ONLY use information from the provided context to answer questions about the organization's data.
4. If the user asks about data not in the context, politely say you don't have that information available.
5. If the user asks about topics outside your allowed domains, politely redirect them to ask about their projects, tasks, or organization data.
6. Always cite which source you're using when referencing specific data.
7. Be helpful, concise, and professional.
8. If you're unsure about something, say so rather than making up information.
9. When the user asks personal questions about themselves, ALWAYS refer to the CURRENT USER FACTS section for accurate information.

When answering:
- Reference specific projects, tasks, or documents by name when available
- Provide actionable insights when possible
- Format responses clearly with bullet points or numbered lists when appropriate
- When asked about organization statistics, refer to the organization overview data
- When asked about deadlines, prioritize upcoming and overdue items
- When discussing risks, mention probability and impact levels
- Include relevant metadata like status, priority, and dates when referencing items
- When the user asks "how many clients do I have?", refer to their personal client count in CURRENT USER FACTS
- When the user asks about "my tasks" or "my projects", use their personal statistics from CURRENT USER FACTS`;
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

  // Fetch user context for personalized responses
  const userContext = await getUserContext(organizationId, userId);

  // Check if query is asking for aggregate/count information or personal info
  const isAggregateQuery = /how many|count|total|number of|statistics|stats|overview/i.test(query);
  const isPersonalQuery = /\b(my|me|i|myself|who am i|do you know me)\b/i.test(query);

  // Always fetch organization overview for aggregate queries
  let orgOverview: SimilarDocument | null = null;
  if (isAggregateQuery || isPersonalQuery) {
    orgOverview = await getOrganizationOverview(organizationId);
  }

  // Search for relevant documents
  const similarDocs = await searchSimilarDocuments({
    organizationId,
    query,
    contentTypes,
    topK: ragConfig.vectorSearch.topK,
  });

  // Combine organization overview with similar docs (avoid duplicates)
  let allDocs = [...similarDocs];
  if (orgOverview && !similarDocs.some(d => d.sourceId === orgOverview?.sourceId)) {
    allDocs = [orgOverview, ...similarDocs];
  }

  // Build context from documents
  const context = buildContextFromDocuments(allDocs);

  // Get conversation history if enabled
  let history: ChatMessage[] = [];
  if (includeHistory) {
    history = await getConversationHistory(sessionId, maxHistoryMessages);
  }

  // Save user message to history
  await saveToHistory(organizationId, userId, sessionId, 'user', query);

  // Build messages for LLM with user context
  const messages: BaseMessage[] = [
    new SystemMessage(buildSystemPrompt(organizationName, userContext)),
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

Remember to only use information from the provided context and the CURRENT USER FACTS in the system prompt. If the information is not available, say so.`;

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
    { sources: allDocs.map(d => ({ id: d.sourceId, type: d.contentType })) }
  );

  return {
    answer,
    sources: allDocs,
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
