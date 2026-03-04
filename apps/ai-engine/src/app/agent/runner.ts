/**
 * AI Engine — Agent Runner (Lazy LangChain)
 * Executes the LLM tool-calling loop.
 * LangChain is only imported when runAgent() is first called.
 */
import { config } from '../config';
import type { AuthenticatedUser, ActionResult } from '../types';
import { filterToolsByPermission } from '../services/rbac.service';
import { getAllToolDefs, type ToolDef } from './tools';

// ── Lazy LangChain imports ─────────────────────────────────────

let DynamicStructuredTool: any = null;
let ChatMistralAI: any = null;
let HumanMessage: any = null;
let SystemMessage: any = null;
let ToolMessage: any = null;
let AIMessage: any = null;

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
    AIMessage = coreMessages.AIMessage;
}

// ── LLM singleton (created lazily) ──────────────────────────────

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
    systemPrompt: string
): Promise<ActionResult & { response: string }> {
    // Load LangChain lazily
    await loadLangChain();

    // Get tools filtered by user's RBAC permissions
    const allDefs = getAllToolDefs();
    const allowedDefs = filterToolsByPermission(user, allDefs);

    if (allowedDefs.length === 0) {
        return {
            success: false,
            response: "I don't have any tools available for your permission level. Please contact your administrator.",
            toolsUsed: [],
            iterations: 0,
        };
    }

    const tools = toLangChainTools(allowedDefs);
    const llm = getLLM();
    const llmWithTools = llm.bindTools(tools);

    const messages: any[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(query),
    ];

    const toolsUsed: string[] = [];
    let iterations = 0;
    const maxIter = config.agent.maxIterations;

    while (iterations < maxIter) {
        iterations++;

        const response = await llmWithTools.invoke(messages);
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
            const tool = tools.find((t: any) => t.name === toolCall.name);
            if (!tool) {
                messages.push(
                    new ToolMessage({
                        toolCallId: toolCall.id,
                        content: JSON.stringify({ error: `Tool "${toolCall.name}" not available.` }),
                    })
                );
                continue;
            }

            try {
                const result = await tool.invoke(toolCall.args);
                toolsUsed.push(toolCall.name);
                messages.push(
                    new ToolMessage({ toolCallId: toolCall.id, content: result })
                );
            } catch (err: any) {
                messages.push(
                    new ToolMessage({
                        toolCallId: toolCall.id,
                        content: JSON.stringify({ error: err.message }),
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
