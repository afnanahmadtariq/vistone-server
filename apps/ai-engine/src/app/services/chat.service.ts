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

// ── Action Detection ────────────────────────────────────────────

const ACTION_KEYWORDS = [
    'create', 'make', 'add', 'new', 'build', 'set up', 'setup',
    'update', 'change', 'modify', 'edit', 'rename',
    'delete', 'remove', 'cancel',
    'assign', 'reassign', 'transfer',
    'send', 'notify', 'message', 'announce',
    'mark', 'complete', 'close', 'reopen',
    // 'yes/ok' still trigger agent so it can continue a multi-step write action
    'yes', 'ok', 'sure', 'proceed', 'go ahead', 'do it',
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
            isOutOfScope: true,
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
        return handleAction(user, queryText, sid, context, sources, history);
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
    // We use the Agent runner in ReadOnly mode.
    // This allows the LLM to fetch missing data (e.g., project lists) while strictly preventing state changes.
    const { runAgent } = await import('../agent/runner.js');

    const systemPrompt =
        buildSystemPrompt(user, context) +
        `

INFO MODE (Read-Only):
You have access to data-retrieval tools. If the retrieved context doesn't contain the answer (e.g., user asks for counts or lists not in snippets), use a 'list_...' or 'get_...' tool to find it. 
- You MUST NOT use any tools that create, update, or delete resources.
- Answer the user's question accurately based on context and tool results.`;

    const result = await runAgent(user, queryText, systemPrompt, history, true);

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
        isOutOfScope: false,
        isActionResponse: false, // UI remains in "Informational" mode
        actionResult: {
            success: result.success,
            toolsUsed: result.toolsUsed,
            iterations: result.iterations,
        },
    };
}

// ── Action Query (Agent) ────────────────────────────────────────

async function handleAction(
    user: AuthenticatedUser,
    queryText: string,
    sessionId: string,
    context: string,
    sources: ChatResponse['sources'],
    history: { role: string; content: string }[] = []
): Promise<ChatResponse> {
    // Lazy import the agent runner
    const { runAgent } = await import('../agent/runner.js');

    const systemPrompt = buildSystemPrompt(user, context) + `

AGENT MODE:
You have access to tools to perform actions. Use them to fulfill the user's request.
- The user's ID is: ${user.id}
- The organization ID is: ${user.organizationId}
- Only use tools that match the user's permissions.
- After completing actions, summarize what you did clearly.`;

    const result = await runAgent(user, queryText, systemPrompt, history);

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
        isOutOfScope: false,
        isActionResponse: true,
        actionResult: {
            success: result.success,
            toolsUsed: result.toolsUsed,
            iterations: result.iterations,
        },
    };
}

// ── Re-export clearHistory for routes ───────────────────────────
export { ragClearHistory as clearHistory };
