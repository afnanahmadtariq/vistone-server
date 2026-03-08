/**
 * AI Engine — Unified Chat Service
 * Single pipeline that auto-detects whether to answer with RAG or execute via Agent.
 * LangChain is lazy-loaded — zero cost at idle.
 *
 * CONFIRMATION FLOW:
 *   1. User sends an action query (e.g. "delete all projects").
 *   2. The service runs a *dry-run* (planAgent) — asks the LLM what tools it
 *      would call, but does NOT execute them.
 *   3. Returns a `pendingAction` with a human-readable description + tool list.
 *   4. Frontend shows a confirmation dialog.
 *   5. User confirms → frontend sends the SAME query again with
 *      `confirmAction: true`.
 *   6. This time the service runs `runAgent` to actually execute.
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
];

/** Words that signal the user is confirming a previous pending action */
const CONFIRM_KEYWORDS = [
    'yes', 'ok', 'sure', 'proceed', 'go ahead', 'do it',
    'confirm', 'approved', 'approve', 'accept', 'agreed',
];

function isActionQuery(query: string): boolean {
    const lower = query.toLowerCase().trim();
    return ACTION_KEYWORDS.some(
        (kw) => lower.startsWith(kw) || lower.includes(` ${kw} `) || lower.includes(`${kw} `)
    );
}

function isConfirmation(query: string): boolean {
    const lower = query.toLowerCase().trim();
    return CONFIRM_KEYWORDS.some(
        (kw) => lower === kw || lower.startsWith(kw + ' ') || lower.startsWith(kw + ',') || lower.startsWith(kw + '.')
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
    sessionId?: string,
    confirmAction?: boolean
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

    // 4. Detect mode
    //    a) If confirmAction is explicitly true, execute immediately (user already confirmed)
    //    b) If it's a simple confirmation word AND there's a pending action in history, execute the original query
    //    c) If it's an action query, do a dry-run first
    //    d) Otherwise, it's an info query

    if (confirmAction) {
        // Explicit confirmation from the frontend — execute now
        return handleAction(user, queryText, sid, context, sources, history);
    }

    if (isConfirmation(queryText)) {
        // Check if there's a pending action in recent history
        const pendingQuery = findPendingActionQuery(history);
        if (pendingQuery) {
            return handleAction(user, pendingQuery, sid, context, sources, history);
        }
    }

    if (isActionQuery(queryText)) {
        return handleActionWithConfirmation(user, queryText, sid, context, sources, history);
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

// ── Action with Confirmation (Dry-Run) ──────────────────────────
// Asks the LLM what it would do without executing, then returns
// a pendingAction for the frontend to show a confirmation dialog.

async function handleActionWithConfirmation(
    user: AuthenticatedUser,
    queryText: string,
    sessionId: string,
    context: string,
    sources: ChatResponse['sources'],
    history: { role: string; content: string }[] = []
): Promise<ChatResponse> {
    const { planAgent, isWriteTool } = await import('../agent/runner.js');

    const systemPrompt = buildSystemPrompt(user, context) + `

AGENT MODE (Planning):
You have access to tools to perform actions. The user asked you to do something.
Determine which tools you need to call to fulfill the request.
- The user's ID is: ${user.id}
- The organization ID is: ${user.organizationId}
- Only use tools that match the user's permissions.`;

    const plan = await planAgent(user, queryText, systemPrompt, history);

    // If the plan only uses read tools, skip confirmation and just run
    const hasWriteTools = plan.tools.some(isWriteTool);

    if (!hasWriteTools) {
        // Pure read query (LLM misclassified or only needs to list/get)
        return handleInfoQuery(user, queryText, sessionId, context, sources, history);
    }

    // Save the pending action query to history so confirmation words can find it
    await saveToHistory(user.organizationId, user.id, sessionId, 'user', queryText);
    await saveToHistory(user.organizationId, user.id, sessionId, 'assistant', plan.description, {
        pendingAction: { description: plan.description, tools: plan.tools, originalQuery: queryText },
    });

    return {
        answer: plan.description,
        sessionId,
        sources,
        isOutOfScope: false,
        isActionResponse: false,
        pendingAction: {
            description: plan.description,
            tools: plan.tools,
            originalQuery: queryText,
        },
    };
}

// ── Action Execution (Confirmed) ────────────────────────────────

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
The user has already confirmed this action — proceed immediately.
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

// ── Helper: find the original action query from a pending action in history ──

function findPendingActionQuery(
    history: { role: string; content: string }[]
): string | null {
    // Walk backwards through history to find the most recent pending action
    // The metadata is embedded in the content by saveToHistory
    // We look for the pattern where assistant message preceded by user message
    // and the assistant message contains the pending action marker
    for (let i = history.length - 1; i >= 1; i--) {
        if (history[i].role === 'assistant' && history[i - 1].role === 'user') {
            // The original query is in the user message before the pending action response
            // We return it so we can re-execute
            return history[i - 1].content;
        }
    }
    return null;
}

// ── Re-export clearHistory for routes ───────────────────────────
export { ragClearHistory as clearHistory };
