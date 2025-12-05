/**
 * Enhanced RAG Service with Agent Capabilities
 * Combines retrieval-augmented generation with action execution
 */
import { ChatMistralAI } from '@langchain/mistralai';
import { HumanMessage, SystemMessage, AIMessage, type BaseMessage } from '@langchain/core/messages';
import { ragConfig } from '../config';
import { searchSimilarDocuments, buildContextFromDocuments, getOrganizationOverview, type SimilarDocument } from './vector-store.service';
import { getUserContext, formatUserContextForPrompt, type UserContext } from './user-context.service';
import { type ChatMessage } from './rag.service';
import { getPrismaClient } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { runAgent, requiresAgentExecution, type AgentResult, type AgentConfig } from '../agent';
import { toolCategories } from '../agent/tools';

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
 * Build the system prompt for RAG queries
 */
function buildSystemPrompt(organizationName?: string, userContext?: UserContext | null): string {
  const allowedDomains = ragConfig.systemPrompt.allowedDomains.join(', ');
  const blockedTopics = ragConfig.systemPrompt.blockedTopics.join(', ');

  let userContextSection = '';
  if (userContext) {
    userContextSection = `

${formatUserContextForPrompt(userContext)}

IMPORTANT: When the user asks about themselves (e.g., "who am I?", "do you know me?", "what are my tasks?", "how many clients do I have?"), 
use the CURRENT USER FACTS above to provide accurate, personalized responses.
`;
  }

  return `You are an AI assistant for Vistone, a project management and workforce management platform.
${organizationName ? `You are currently helping a member of the organization: "${organizationName}".` : ''}
${userContextSection}
You have access to the full context of the organization including projects, tasks, milestones, teams, clients, and documents.

IMPORTANT RULES:
1. You MUST only answer questions related to: ${allowedDomains}.
2. You MUST NOT discuss topics like: ${blockedTopics}.
3. You can ONLY use information from the provided context.
4. If the user asks about data not in the context, politely say you don't have that information.
5. If the user asks about topics outside your allowed domains, redirect them.
6. Always cite sources when referencing specific data.
7. Be helpful, concise, and professional.

NOTE: If the user asks you to PERFORM AN ACTION (create, update, delete, send, etc.), 
indicate that you can help with that and will execute the action. Actions will be handled by the agent system.`;
}

export interface EnhancedRagQueryOptions {
  organizationId: string;
  organizationName?: string;
  userId: string;
  userName?: string;
  sessionId?: string;
  query: string;
  contentTypes?: string[];
  includeHistory?: boolean;
  maxHistoryMessages?: number;
  enableAgent?: boolean;
  enabledToolCategories?: (keyof typeof toolCategories)[];
}

export interface EnhancedRagResponse {
  answer: string;
  sources: SimilarDocument[];
  sessionId: string;
  isOutOfScope: boolean;
  isActionResponse: boolean;
  actionResult?: {
    success: boolean;
    toolsUsed: string[];
    iterations: number;
  };
}

/**
 * Check if query is within allowed scope
 */
function isQueryInScope(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
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
 * Enhanced RAG query function with agent capabilities
 */
export async function queryWithEnhancedRag(options: EnhancedRagQueryOptions): Promise<EnhancedRagResponse> {
  const {
    organizationId,
    organizationName,
    userId,
    userName,
    query,
    contentTypes,
    includeHistory = true,
    maxHistoryMessages = 6,
    enableAgent = true,
    enabledToolCategories,
  } = options;

  const sessionId = options.sessionId || uuidv4();

  // Check if query is in scope
  if (!isQueryInScope(query)) {
    return {
      answer: "I'm sorry, but I can only help with questions related to your projects, tasks, team, and organization data. Is there anything about your work I can help you with?",
      sources: [],
      sessionId,
      isOutOfScope: true,
      isActionResponse: false,
    };
  }

  // Save user message to history
  await saveToHistory(organizationId, userId, sessionId, 'user', query);

  // Check if this is an action request that requires the agent
  if (enableAgent && requiresAgentExecution(query)) {
    // Run the agent for action-oriented queries
    const agentConfig: AgentConfig = {
      organizationId,
      organizationName,
      userId,
      userName,
      enabledToolCategories,
      maxIterations: 5,
      verbose: process.env.NODE_ENV === 'development',
    };

    // Get conversation history for context
    const history = includeHistory
      ? await getConversationHistory(sessionId, maxHistoryMessages)
      : [];

    const historyMessages: BaseMessage[] = history.map(msg =>
      msg.role === 'user'
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    const agentResult = await runAgent(query, agentConfig, historyMessages);

    // Save assistant response to history
    await saveToHistory(
      organizationId,
      userId,
      sessionId,
      'assistant',
      agentResult.response,
      {
        isActionResponse: true,
        toolsUsed: agentResult.toolsUsed,
        iterations: agentResult.iterations,
      }
    );

    return {
      answer: agentResult.response,
      sources: [],
      sessionId,
      isOutOfScope: false,
      isActionResponse: true,
      actionResult: {
        success: agentResult.success,
        toolsUsed: agentResult.toolsUsed,
        iterations: agentResult.iterations,
      },
    };
  }

  // Regular RAG query for informational requests
  const userContext = await getUserContext(organizationId, userId);

  const isAggregateQuery = /how many|count|total|number of|statistics|stats|overview/i.test(query);
  const isPersonalQuery = /\b(my|me|i|myself|who am i|do you know me)\b/i.test(query);

  let orgOverview: SimilarDocument | null = null;
  if (isAggregateQuery || isPersonalQuery) {
    orgOverview = await getOrganizationOverview(organizationId);
  }

  const similarDocs = await searchSimilarDocuments({
    organizationId,
    query,
    contentTypes,
    topK: ragConfig.vectorSearch.topK,
  });

  let allDocs = [...similarDocs];
  if (orgOverview && !similarDocs.some(d => d.sourceId === orgOverview?.sourceId)) {
    allDocs = [orgOverview, ...similarDocs];
  }

  const context = buildContextFromDocuments(allDocs);

  let history: ChatMessage[] = [];
  if (includeHistory) {
    history = await getConversationHistory(sessionId, maxHistoryMessages);
  }

  const messages: BaseMessage[] = [
    new SystemMessage(buildSystemPrompt(organizationName, userContext)),
  ];

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  const contextualQuery = `
Based on the following context from the organization's data, please answer the user's question.

CONTEXT:
${context}

USER QUESTION: ${query}

Remember to only use information from the provided context. If the information is not available, say so.`;

  messages.push(new HumanMessage(contextualQuery));

  const chatModel = getChatModel();
  const response = await chatModel.invoke(messages);

  const answer = typeof response.content === 'string' 
    ? response.content 
    : JSON.stringify(response.content);

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
    isActionResponse: false,
  };
}

/**
 * Execute a specific agent action directly
 */
export async function executeAgentAction(
  action: string,
  organizationId: string,
  userId: string,
  userName?: string,
  enabledToolCategories?: (keyof typeof toolCategories)[]
): Promise<AgentResult> {
  const agentConfig: AgentConfig = {
    organizationId,
    userId,
    userName,
    enabledToolCategories,
    maxIterations: 3,
    verbose: process.env.NODE_ENV === 'development',
  };

  return runAgent(action, agentConfig);
}
