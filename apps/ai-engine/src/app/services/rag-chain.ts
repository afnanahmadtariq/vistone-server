import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { getMistralLLM } from './mistral';
import { querySimilarDocuments, formatRetrievedContext } from './embedding';
import { ServiceActionExecutor, getActionExecutor } from '../grpc/client';

// Action types that AI can perform
export type ActionType =
  | 'query' // Just answer a question
  | 'create_project'
  | 'update_project'
  | 'create_task'
  | 'update_task'
  | 'create_milestone'
  | 'create_team'
  | 'update_team'
  | 'add_team_member'
  | 'create_user'
  | 'update_user'
  | 'create_client'
  | 'update_client'
  | 'create_proposal'
  | 'create_wiki_page'
  | 'update_wiki_page'
  | 'send_message'
  | 'create_channel'
  | 'send_notification';

// Chat message type
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Response from the RAG system
export interface RAGResponse {
  answer: string;
  action?: {
    type: ActionType;
    executed: boolean;
    result?: any;
    error?: string;
  };
  context: {
    documentsUsed: number;
    relevanceScores: number[];
  };
  tokensUsed?: number;
}

// System prompt for the AI
const SYSTEM_PROMPT = `You are Vistone AI, an intelligent assistant for a comprehensive business management platform. You have access to:

1. **Projects & Tasks**: Create, update, and manage projects, tasks, milestones, and track progress
2. **Teams & Workforce**: Manage teams, team members, skills, and availability
3. **Clients**: Handle client information, proposals, and feedback
4. **Knowledge Hub**: Access and manage wiki pages and documents
5. **Communication**: Channels and messaging
6. **Notifications**: Send and manage notifications
7. **Monitoring**: KPIs, dashboards, and performance metrics

When users ask you to DO something (create, update, modify, add, etc.), you should:
1. Understand what action they want
2. Extract the necessary parameters from their request
3. Execute the action and confirm the result

When users ask QUESTIONS, use the provided context to give accurate, helpful answers.

**Action Format**: When you determine an action is needed, respond with:
\`\`\`action
{
  "type": "action_type",
  "params": { ... }
}
\`\`\`

Available action types:
- create_project: { organizationId, name, description?, status, startDate?, endDate?, budget? }
- update_project: { projectId, name?, description?, status?, startDate?, endDate?, budget? }
- create_task: { projectId, title, description?, status, priority?, assigneeId?, dueDate?, parentId? }
- update_task: { taskId, title?, description?, status?, priority?, assigneeId?, dueDate? }
- create_milestone: { projectId, title, description?, dueDate?, status }
- create_team: { organizationId, name, description?, managerId? }
- update_team: { teamId, name?, description?, managerId? }
- add_team_member: { teamId, userId, role? }
- create_user: { email, firstName, lastName, organizationId }
- update_user: { userId, firstName?, lastName?, email? }
- create_client: { name, contactInfo?, portalAccess? }
- update_client: { clientId, name?, contactInfo?, portalAccess? }
- create_proposal: { clientId, title, content?, status }
- create_wiki_page: { title, content?, parentId? }
- update_wiki_page: { pageId, title?, content? }
- send_message: { channelId, senderId, content }
- create_channel: { name, type, teamId?, projectId? }
- send_notification: { userId, content, type? }

Always be helpful, accurate, and proactive in suggesting improvements.`;

// Parse action from AI response
function parseAction(response: string): { type: ActionType; params: any } | null {
  const actionMatch = response.match(/```action\s*\n?([\s\S]*?)\n?```/);
  if (actionMatch) {
    try {
      const actionData = JSON.parse(actionMatch[1]);
      return actionData;
    } catch {
      return null;
    }
  }
  return null;
}

// Execute action via gRPC
async function executeAction(
  executor: ServiceActionExecutor,
  actionType: ActionType,
  params: any
): Promise<any> {
  switch (actionType) {
    case 'create_project':
      return executor.createProject(params);
    case 'update_project':
      return executor.updateProject(params);
    case 'create_task':
      return executor.createTask(params);
    case 'update_task':
      return executor.updateTask(params);
    case 'create_milestone':
      return executor.createMilestone(params);
    case 'create_team':
      return executor.createTeam(params);
    case 'update_team':
      return executor.updateTeam(params);
    case 'add_team_member':
      return executor.addTeamMember(params);
    case 'create_user':
      return executor.createUser(params);
    case 'update_user':
      return executor.updateUser(params);
    case 'create_client':
      return executor.createClient(params);
    case 'update_client':
      return executor.updateClient(params);
    case 'create_proposal':
      return executor.createProposal(params);
    case 'create_wiki_page':
      return executor.createWikiPage(params);
    case 'update_wiki_page':
      return executor.updateWikiPage(params);
    case 'send_message':
      return executor.sendMessage(params);
    case 'create_channel':
      return executor.createChannel(params);
    case 'send_notification':
      return executor.sendNotification(params);
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

// Main RAG chain
export class RAGChain {
  private executor: ServiceActionExecutor;
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    this.executor = getActionExecutor();
  }

  async chat(
    userMessage: string,
    userId?: string,
    organizationId?: string,
    executeActions: boolean = true
  ): Promise<RAGResponse> {
    // Step 1: Retrieve relevant context
    const filter: Record<string, any> = {};
    if (organizationId) {
      filter.organizationId = organizationId;
    }

    const relevantDocs = await querySimilarDocuments(userMessage, 5, Object.keys(filter).length > 0 ? filter : undefined);
    const contextText = formatRetrievedContext(relevantDocs);

    // Step 2: Build conversation messages
    const llm = getMistralLLM();

    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new SystemMessage(`\n\n**Current Context from Knowledge Base:**\n${contextText}`),
      ...this.conversationHistory.map((msg) => {
        switch (msg.role) {
          case 'user':
            return new HumanMessage(msg.content);
          case 'assistant':
            return new AIMessage(msg.content);
          default:
            return new SystemMessage(msg.content);
        }
      }),
      new HumanMessage(userMessage),
    ];

    // Step 3: Get AI response
    const aiResponse = await llm.invoke(messages);
    const responseText = typeof aiResponse.content === 'string' 
      ? aiResponse.content 
      : aiResponse.content.map(c => 'text' in c ? c.text : '').join('');

    // Step 4: Parse and execute action if present
    let action: RAGResponse['action'];
    const parsedAction = parseAction(responseText);

    if (parsedAction && executeActions) {
      try {
        const result = await executeAction(this.executor, parsedAction.type, parsedAction.params);
        action = {
          type: parsedAction.type,
          executed: true,
          result,
        };
      } catch (error: any) {
        action = {
          type: parsedAction.type,
          executed: false,
          error: error.message || 'Action failed',
        };
      }
    } else if (parsedAction) {
      action = {
        type: parsedAction.type,
        executed: false,
      };
    }

    // Step 5: Clean response text (remove action block for display)
    const cleanedResponse = responseText.replace(/```action\s*\n?[\s\S]*?\n?```/g, '').trim();

    // Step 6: Update conversation history
    this.conversationHistory.push({ role: 'user', content: userMessage });
    this.conversationHistory.push({ role: 'assistant', content: cleanedResponse });

    // Keep only last 10 messages to manage context length
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    return {
      answer: cleanedResponse,
      action,
      context: {
        documentsUsed: relevantDocs.length,
        relevanceScores: relevantDocs.map((d) => d.score),
      },
      tokensUsed: aiResponse.usage_metadata?.total_tokens,
    };
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }
}

// Singleton RAG instances per user session
const ragInstances = new Map<string, RAGChain>();

export function getRAGInstance(sessionId: string): RAGChain {
  if (!ragInstances.has(sessionId)) {
    ragInstances.set(sessionId, new RAGChain());
  }
  return ragInstances.get(sessionId)!;
}

export function deleteRAGInstance(sessionId: string): void {
  ragInstances.delete(sessionId);
}
