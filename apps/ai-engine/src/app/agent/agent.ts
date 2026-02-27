/**
 * Vistone AI Agent
 * LangChain-based agent that can execute actions across services
 */
import { ChatMistralAI } from '@langchain/mistralai';
import { HumanMessage, SystemMessage, type BaseMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import { ragConfig } from '../config';
import { allTools, toolCategories, getToolByName } from './tools';
import type { StructuredToolInterface } from '@langchain/core/tools';

// Agent configuration
export interface AgentConfig {
  organizationId: string;
  organizationName?: string;
  userId: string;
  userName?: string;
  enabledToolCategories?: (keyof typeof toolCategories)[];
  maxIterations?: number;
  verbose?: boolean;
}

// Agent execution result
export interface AgentResult {
  success: boolean;
  response: string;
  toolsUsed: string[];
  iterations: number;
  error?: string;
}

// Tool call extracted from LLM response
interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  id: string;
}

/**
 * Build the system prompt for the agent
 */
function buildAgentSystemPrompt(config: AgentConfig, tools: StructuredToolInterface[]): string {
  const toolDescriptions = tools
    .map(t => `- ${t.name}: ${t.description}`)
    .join('\n');

  return `You are an AI assistant for Vistone, a project management and workforce management platform.
You are helping a user from organization "${config.organizationName || config.organizationId}".
${config.userName ? `The current user is ${config.userName} (ID: ${config.userId}).` : `The current user ID is ${config.userId}.`}

You have access to the following tools to perform actions:

${toolDescriptions}

IMPORTANT RULES:
1. When the user asks you to perform an action (create, update, delete, send, etc.), use the appropriate tool.
2. Always provide the organizationId as "${config.organizationId}" when required by tools.
3. Always provide the userId as "${config.userId}" when required by tools (for createdById, senderId, etc.).
4. Parse user requests carefully to extract the required information.
5. If you're missing required information, ask the user for it before calling a tool.
6. After calling a tool, summarize the result in a user-friendly way.
7. If a tool call fails, explain the error and suggest how to fix it.
8. For listing operations, summarize the results concisely.
9. Be helpful, professional, and action-oriented.

When responding:
- Acknowledge what the user wants to do
- Execute the appropriate action using tools
- Confirm what was done with relevant details
- Suggest related actions if appropriate`;
}

/**
 * Get the LLM instance for the agent
 */
function getAgentLLM(): ChatMistralAI {
  if (!ragConfig.mistral.apiKey) {
    throw new Error('MISTRAL_API_KEY environment variable is required');
  }

  return new ChatMistralAI({
    apiKey: ragConfig.mistral.apiKey,
    model: ragConfig.mistral.chatModel,
    temperature: 0.1, // Lower temperature for more deterministic tool use
    maxTokens: ragConfig.mistral.maxTokens,
  });
}

/**
 * Get tools based on enabled categories
 */
function getEnabledTools(config: AgentConfig): StructuredToolInterface[] {
  if (!config.enabledToolCategories || config.enabledToolCategories.length === 0) {
    return allTools as StructuredToolInterface[];
  }

  const tools: StructuredToolInterface[] = [];
  for (const category of config.enabledToolCategories) {
    const categoryTools = toolCategories[category];
    if (categoryTools) {
      tools.push(...(categoryTools as StructuredToolInterface[]));
    }
  }
  return tools;
}

/**
 * Parse tool calls from the LLM response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseToolCalls(response: any): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // Check if response has tool_calls
  if (response.tool_calls && Array.isArray(response.tool_calls)) {
    for (const call of response.tool_calls) {
      toolCalls.push({
        name: call.name,
        arguments: typeof call.args === 'string' ? JSON.parse(call.args) : call.args,
        id: call.id || `call_${Date.now()}`,
      });
    }
  }

  return toolCalls;
}

/**
 * Execute a single tool call
 */
async function executeToolCall(
  toolCall: ToolCall,
  tools: StructuredToolInterface[]
): Promise<{ success: boolean; result: string }> {
  const tool = tools.find(t => t.name === toolCall.name);
  
  if (!tool) {
    return {
      success: false,
      result: JSON.stringify({ error: `Tool "${toolCall.name}" not found` }),
    };
  }

  try {
    const result = await tool.invoke(toolCall.arguments);
    return {
      success: true,
      result: typeof result === 'string' ? result : JSON.stringify(result),
    };
  } catch (error) {
    return {
      success: false,
      result: JSON.stringify({ error: (error as Error).message }),
    };
  }
}

/**
 * Run the agent with a user query
 */
export async function runAgent(
  query: string,
  config: AgentConfig,
  conversationHistory: BaseMessage[] = []
): Promise<AgentResult> {
  const tools = getEnabledTools(config);
  const llm = getAgentLLM();
  const llmWithTools = llm.bindTools(tools);

  const systemPrompt = buildAgentSystemPrompt(config, tools);
  const toolsUsed: string[] = [];
  let iterations = 0;
  const maxIterations = config.maxIterations || 5;

  // Build initial messages
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...conversationHistory,
    new HumanMessage(query),
  ];

  try {
    while (iterations < maxIterations) {
      iterations++;

      if (config.verbose) {
        console.log(`Agent iteration ${iterations}/${maxIterations}`);
      }

      // Get LLM response
      const response = await llmWithTools.invoke(messages);
      messages.push(response);

      // Check for tool calls
      const toolCalls = parseToolCalls(response);

      if (toolCalls.length === 0) {
        // No more tool calls, return the response
        const content = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        return {
          success: true,
          response: content,
          toolsUsed,
          iterations,
        };
      }

      // Execute tool calls
      for (const toolCall of toolCalls) {
        if (config.verbose) {
          console.log(`Executing tool: ${toolCall.name}`);
          console.log(`Arguments:`, toolCall.arguments);
        }

        toolsUsed.push(toolCall.name);
        const { result } = await executeToolCall(toolCall, tools);

        if (config.verbose) {
          console.log(`Tool result:`, result);
        }

        // Add tool result to messages
        messages.push(new ToolMessage({
          content: result,
          tool_call_id: toolCall.id,
        }));
      }
    }

    // Max iterations reached
    return {
      success: false,
      response: 'Maximum iterations reached. The request may be too complex.',
      toolsUsed,
      iterations,
      error: 'MAX_ITERATIONS_REACHED',
    };

  } catch (error) {
    console.error('Agent execution error:', error);
    return {
      success: false,
      response: `An error occurred: ${(error as Error).message}`,
      toolsUsed,
      iterations,
      error: (error as Error).message,
    };
  }
}

/**
 * Check if a query requires agent execution (action-oriented)
 */
export function requiresAgentExecution(query: string): boolean {
  const actionKeywords = [
    'create', 'add', 'make', 'new',
    'update', 'change', 'modify', 'edit',
    'delete', 'remove', 'cancel',
    'send', 'notify', 'message',
    'assign', 'move', 'transfer',
    'set', 'configure',
    'schedule', 'book',
    'invite', 'join',
  ];

  const lowerQuery = query.toLowerCase();
  return actionKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Get available tool names for a configuration
 */
export function getAvailableToolNames(config: AgentConfig): string[] {
  const tools = getEnabledTools(config);
  return tools.map(t => t.name);
}

/**
 * Get tool description by name
 */
export function getToolDescription(toolName: string): string | undefined {
  const tool = getToolByName(toolName);
  return tool?.description;
}
