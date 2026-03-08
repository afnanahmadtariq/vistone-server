/**
 * AI Engine — Agent Runner (Lazy LangChain)
 * Executes the LLM tool-calling loop.
 * LangChain is only imported when runAgent() is first called.
 *
 * Supports two modes:
 *   - planAgent(): Dry-run — asks LLM what tools it *would* call, but
 *     does NOT execute them. Returns a human-readable description for the
 *     user to confirm.
 *   - runAgent():  Full execution — actually calls the tools.
 */
import { config } from '../config';
import type { AuthenticatedUser, ActionResult } from '../types';
import { filterToolsByPermission } from '../services/rbac.service';
import { getAllToolDefs, type ToolDef } from './tools';
import { TOOL_PERMISSIONS } from '../types';

// ── Lazy LangChain imports ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DynamicStructuredTool: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ChatMistralAI: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HumanMessage: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SystemMessage: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ToolMessage: any = null;

async function loadLangChain() {
    if (DynamicStructuredTool) return;

    const [coreTools, mistral, coreMessages] = await Promise.all([
        import('@langchain/core/tools'),
        import('@langchain/mistralai'),
        import('@langchain/core/messages'),
    ]);

    DynamicStructuredTool = coreTools.DynamicStructuredTool;
    ChatMistralAI = mistral.ChatMistralAI;
    HumanMessage = coreMessages.HumanMessage;
    SystemMessage = coreMessages.SystemMessage;
    ToolMessage = coreMessages.ToolMessage;
}

// ── LLM singleton (created lazily) ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _llm: any = null;

function getLLM() {
    if (!_llm) {
        _llm = new ChatMistralAI({
            apiKey: config.mistral.apiKey,
            model: config.mistral.chatModel,
            temperature: config.mistral.temperature,
            maxTokens: config.mistral.maxTokens,
        });
    }
    return _llm;
}

// ── Helper: is a tool a write (non-read) action? ───────────────

export function isWriteTool(toolName: string): boolean {
    const perm = TOOL_PERMISSIONS[toolName];
    return !!perm && perm.action !== 'read';
}

// ── Convert plain ToolDefs → LangChain DynamicStructuredTools ───

function toLangChainTools(defs: ToolDef[]) {
    return defs.map(
        (d) =>
            new DynamicStructuredTool({
                name: d.name,
                description: d.description,
                schema: d.schema,
                func: d.func,
            })
    );
}

// ── Run the Agent ───────────────────────────────────────────────

export async function runAgent(
    user: AuthenticatedUser,
    query: string,
    systemPrompt: string,
    history: { role: string; content: string }[] = [],
    readOnly = false
): Promise<ActionResult & { response: string }> {
    // Load LangChain lazily
    await loadLangChain();

    // Get tools filtered by user's RBAC permissions
    const allDefs = getAllToolDefs();
    let allowedDefs = filterToolsByPermission(user, allDefs);

    // If readOnly is true, filter out non-read tools
    if (readOnly) {
        allowedDefs = allowedDefs.filter((d) => {
            const perm = TOOL_PERMISSIONS[d.name];
            return perm && perm.action === 'read';
        });
    }

    if (allowedDefs.length === 0 && !readOnly) {
        return {
            success: false,
            response: "I don't have any tools available for your permission level. Please contact your administrator.",
            toolsUsed: [],
            iterations: 0,
        };
    }

    // No tools available in ReadOnly is fine (fall back to pure LLM/RAG if needed)
    const tools = allowedDefs.length > 0 ? toLangChainTools(allowedDefs) : [];
    const llm = getLLM();
    // Only bind if there are tools
    const llmWithTools = tools.length > 0 ? llm.bindTools(tools) : llm;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [new SystemMessage(systemPrompt)];

    // Add history support
    for (const h of history) {
        if (h.role === 'user') {
            messages.push(new HumanMessage(h.content));
        } else {
            // Simply use assistant for history content
            messages.push({ role: 'assistant', content: h.content });
        }
    }

    // Add current query
    messages.push(new HumanMessage(query));

    const toolsUsed: string[] = [];
    let iterations = 0;
    const maxIter = config.agent.maxIterations;

    while (iterations < maxIter) {
        iterations++;

        const response = await llmWithTools.invoke(messages);
        // Ensure content is not empty to avoid Mistral rejecting the assistant message
        if (!response.content || response.content === "") {
            response.content = " ";
        }
        messages.push(response);

        // Check if LLM wants to call tools
        const toolCalls = response.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            // No more tool calls — LLM is done
            return {
                success: true,
                response: response.content || 'Action completed.',
                toolsUsed: [...new Set(toolsUsed)],
                iterations,
            };
        }

        // Execute each tool call
        for (const toolCall of toolCalls) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tool = tools.find((t: any) => t.name === toolCall.name);
            if (!tool) {
                messages.push(
                    new ToolMessage({
                        tool_call_id: toolCall.id,
                        name: toolCall.name,
                        content: JSON.stringify({ error: `Tool "${toolCall.name}" not available.` }),
                    })
                );
                continue;
            }

            try {
                const result = await tool.invoke(toolCall.args);
                toolsUsed.push(toolCall.name);
                messages.push(
                    new ToolMessage({ tool_call_id: toolCall.id, name: toolCall.name, content: result })
                );
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Tool execution failed';
                messages.push(
                    new ToolMessage({
                        tool_call_id: toolCall.id,
                        name: toolCall.name,
                        content: JSON.stringify({ error: message }),
                    })
                );
            }
        }
    }

    // Max iterations reached — summarize
    const finalResponse = await llm.invoke([
        ...messages,
        new HumanMessage(
            'Maximum iterations reached. Please summarize what was accomplished and what remains.'
        ),
    ]);

    return {
        success: true,
        response: finalResponse.content || 'Completed with maximum iterations.',
        toolsUsed: [...new Set(toolsUsed)],
        iterations,
    };
}

// ── Plan Agent (Dry-Run) ────────────────────────────────────────
// Asks the LLM what tools it would call for the query, collects
// their names, then asks it to produce a human-readable summary
// WITHOUT actually executing anything.

export async function planAgent(
    user: AuthenticatedUser,
    query: string,
    systemPrompt: string,
    history: { role: string; content: string }[] = []
): Promise<{ description: string; tools: string[] }> {
    await loadLangChain();

    const allDefs = getAllToolDefs();
    const allowedDefs = filterToolsByPermission(user, allDefs);

    if (allowedDefs.length === 0) {
        return {
            description: "I don't have any tools available for your permission level.",
            tools: [],
        };
    }

    const tools = toLangChainTools(allowedDefs);
    const llm = getLLM();
    const llmWithTools = llm.bindTools(tools);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [new SystemMessage(systemPrompt)];

    for (const h of history) {
        if (h.role === 'user') {
            messages.push(new HumanMessage(h.content));
        } else {
            messages.push({ role: 'assistant', content: h.content });
        }
    }

    messages.push(new HumanMessage(query));

    // Single LLM call — we only need the first set of tool_calls
    const response = await llmWithTools.invoke(messages);

    const toolCalls = response.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
        // LLM didn't want to call any tools — it answered directly
        return {
            description: response.content || query,
            tools: [],
        };
    }

    const plannedTools = toolCalls.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tc: any) => tc.name as string
    ) as string[];

    // Ask the LLM to describe what it's about to do in plain English
    if (!response.content || response.content.trim() === '' || response.content === ' ') {
        response.content = ' ';
    }
    messages.push(response);

    // Provide fake tool results so the LLM can summarise
    for (const tc of toolCalls) {
        messages.push(
            new ToolMessage({
                tool_call_id: tc.id,
                name: tc.name,
                content: JSON.stringify({ pending: true, message: 'Awaiting user confirmation.' }),
            })
        );
    }

    messages.push(
        new HumanMessage(
            'Do NOT execute any actions. Instead, list exactly what you are about to do in a short bullet-point summary so the user can confirm. Start with "I\'d like to:"'
        )
    );

    const summaryResponse = await llm.invoke(messages);
    const description =
        (summaryResponse.content as string) || plannedTools.map((t) => `• ${t}`).join('\n');

    return { description, tools: [...new Set(plannedTools)] };
}
