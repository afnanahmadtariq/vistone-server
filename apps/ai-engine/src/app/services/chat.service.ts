/**
 * AI Engine — Unified Chat Service
 * Single pipeline that auto-detects whether to answer with RAG or execute via Agent.
 * LangChain is lazy-loaded — zero cost at idle.
 */
import { config } from '../config';
import type { AuthenticatedUser, ChatResponse } from '../types';
import { describePermissions } from './rbac.service';
import {
    searchSimilar,
    buildContext,
    extractSources,
    getConversationHistory,
    saveToHistory,
    clearHistory as ragClearHistory,
} from './rag.service';
import { v4 as uuidv4 } from 'uuid';

// ── Lazy LLM (loaded only on first chat) ────────────────────────

let _ChatMistralAI: any = null;
let _HumanMessage: any = null;
let _SystemMessage: any = null;

async function loadChatModules() {
    if (_ChatMistralAI) return;
    const [mistral, messages] = await Promise.all([
        import('@langchain/mistralai'),
        import('@langchain/core/messages'),
    ]);
    _ChatMistralAI = mistral.ChatMistralAI;
    _HumanMessage = messages.HumanMessage;
    _SystemMessage = messages.SystemMessage;
}

let _chatLLM: any = null;

async function getChatLLM() {
    await loadChatModules();
    if (!_chatLLM) {
        _chatLLM = new _ChatMistralAI({
            apiKey: config.mistral.apiKey,
            model: config.mistral.chatModel,
            temperature: config.mistral.temperature,
            maxTokens: config.mistral.maxTokens,
        });
    }
    return _chatLLM;
}

// ── Action Detection ────────────────────────────────────────────

const ACTION_KEYWORDS = [
    'create', 'make', 'add', 'new', 'build', 'set up', 'setup',
    'update', 'change', 'modify', 'edit', 'rename',
    'delete', 'remove', 'cancel',
    'assign', 'reassign', 'transfer',
    'send', 'notify', 'message', 'announce',
    'mark', 'complete', 'close', 'reopen',
];

function isActionQuery(query: string): boolean {
    const lower = query.toLowerCase().trim();
    return ACTION_KEYWORDS.some(
        (kw) => lower.startsWith(kw) || lower.includes(` ${kw} `) || lower.includes(`${kw} `)
    );
}

// ── Scope Check ─────────────────────────────────────────────────

function isOutOfScope(query: string): boolean {
    const lower = query.toLowerCase();
    return config.blockedTopics.some((topic) => lower.includes(topic));
}

// ── System Prompt ───────────────────────────────────────────────

function buildSystemPrompt(user: AuthenticatedUser, context: string): string {
    const userName = user.name || user.firstName || user.email;
    const permSummary = describePermissions(user);

    return `You are Vistone AI, an intelligent assistant for the ${user.organizationName || 'organization'} workspace.

Current user: ${userName} (${user.role})
Organization: ${user.organizationName || user.organizationId}

${permSummary}

RULES:
- Only answer questions related to the organization's projects, tasks, teams, clients, documents, and operations.
- If the user asks about topics outside the workspace (politics, medical, legal, etc.), politely decline.
- Use the retrieved context below to answer factual questions. If the context doesn't contain the answer, say so honestly.
- When executing actions, only use tools the user has permission for.
- Always be concise and professional.

RETRIEVED CONTEXT:
${context || 'No relevant documents found.'}`;
}

// ── Unified Chat Pipeline ───────────────────────────────────────

export async function chat(
    user: AuthenticatedUser,
    queryText: string,
    sessionId?: string
): Promise<ChatResponse> {
    const sid = sessionId || uuidv4();

    // 1. Scope check
    if (isOutOfScope(queryText)) {
        return {
            answer: "I'm designed to help with your organization's workspace — projects, tasks, teams, and more. I can't help with that topic.",
            sessionId: sid,
            sources: [],
        };
    }

    // 2. Retrieve context via RBAC-filtered vector search
    const similarDocs = await searchSimilar(user, queryText);
    const context = buildContext(similarDocs);
    const sources = extractSources(similarDocs);

    // 3. Get conversation history
    const history = await getConversationHistory(sid);

    // 4. Detect mode: action or information
    if (isActionQuery(queryText)) {
        return handleAction(user, queryText, sid, context, sources);
    }

    return handleInfoQuery(user, queryText, sid, context, sources, history);
}

// ── Info Query (RAG) ────────────────────────────────────────────

async function handleInfoQuery(
    user: AuthenticatedUser,
    queryText: string,
    sessionId: string,
    context: string,
    sources: ChatResponse['sources'],
    history: { role: string; content: string }[]
): Promise<ChatResponse> {
    await loadChatModules();
    const llm = await getChatLLM();

    const systemPrompt = buildSystemPrompt(user, context);

    const messages: any[] = [new _SystemMessage(systemPrompt)];

    // Add conversation history
    for (const h of history) {
        if (h.role === 'user') {
            messages.push(new _HumanMessage(h.content));
        } else {
            // Use a simple object for assistant messages from history
            messages.push({ role: 'assistant', content: h.content });
        }
    }

    messages.push(new _HumanMessage(queryText));

    const response = await llm.invoke(messages);
    const answer = response.content || "I couldn't generate a response.";

    // Save to history
    await saveToHistory(user.organizationId, user.id, sessionId, 'user', queryText);
    await saveToHistory(user.organizationId, user.id, sessionId, 'assistant', answer, {
        sources,
    });

    return { answer, sessionId, sources };
}

// ── Action Query (Agent) ────────────────────────────────────────

async function handleAction(
    user: AuthenticatedUser,
    queryText: string,
    sessionId: string,
    context: string,
    sources: ChatResponse['sources']
): Promise<ChatResponse> {
    // Lazy import the agent runner
    const { runAgent } = await import('../agent/runner');

    const systemPrompt = buildSystemPrompt(user, context) + `

AGENT MODE:
You have access to tools to perform actions. Use them to fulfill the user's request.
- The user's ID is: ${user.id}
- The organization ID is: ${user.organizationId}
- Only use tools that match the user's permissions.
- After completing actions, summarize what you did clearly.`;

    const result = await runAgent(user, queryText, systemPrompt);

    // Save to history
    await saveToHistory(user.organizationId, user.id, sessionId, 'user', queryText);
    await saveToHistory(user.organizationId, user.id, sessionId, 'assistant', result.response, {
        sources,
        actionResult: {
            success: result.success,
            toolsUsed: result.toolsUsed,
            iterations: result.iterations,
        },
    });

    return {
        answer: result.response,
        sessionId,
        sources,
        actionResult: {
            success: result.success,
            toolsUsed: result.toolsUsed,
            iterations: result.iterations,
        },
    };
}

// ── Re-export clearHistory for routes ───────────────────────────
export { ragClearHistory as clearHistory };
