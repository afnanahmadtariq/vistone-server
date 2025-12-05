/**
 * Agent Routes
 * API endpoints for AI agent interactions
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { queryWithEnhancedRag, executeAgentAction } from '../services/enhanced-rag.service';
import { getAvailableToolNames, getToolDescription } from '../agent';
import { toolCategories } from '../agent/tools';

interface AgentQueryBody {
  organizationId: string;
  organizationName?: string;
  userId: string;
  userName?: string;
  sessionId?: string;
  query: string;
  enableAgent?: boolean;
  enabledToolCategories?: (keyof typeof toolCategories)[];
}

interface ExecuteActionBody {
  organizationId: string;
  userId: string;
  userName?: string;
  action: string;
  enabledToolCategories?: (keyof typeof toolCategories)[];
}

interface ToolInfoParams {
  toolName: string;
}

export default async function agentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/agent/query
   * Enhanced RAG query with agent capabilities
   */
  fastify.post<{ Body: AgentQueryBody }>(
    '/api/agent/query',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'userId', 'query'],
          properties: {
            organizationId: { type: 'string' },
            organizationName: { type: 'string' },
            userId: { type: 'string' },
            userName: { type: 'string' },
            sessionId: { type: 'string' },
            query: { type: 'string', minLength: 1, maxLength: 2000 },
            enableAgent: { type: 'boolean', default: true },
            enabledToolCategories: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.keys(toolCategories),
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  answer: { type: 'string' },
                  sessionId: { type: 'string' },
                  isOutOfScope: { type: 'boolean' },
                  isActionResponse: { type: 'boolean' },
                  actionResult: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      toolsUsed: { type: 'array', items: { type: 'string' } },
                      iterations: { type: 'number' },
                    },
                  },
                  sources: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        contentType: { type: 'string' },
                        title: { type: 'string' },
                        sourceId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AgentQueryBody }>, reply: FastifyReply) => {
      try {
        const {
          organizationId,
          organizationName,
          userId,
          userName,
          sessionId,
          query,
          enableAgent = true,
          enabledToolCategories,
        } = request.body;

        const result = await queryWithEnhancedRag({
          organizationId,
          organizationName,
          userId,
          userName,
          sessionId,
          query,
          enableAgent,
          enabledToolCategories,
        });

        return reply.send({
          success: true,
          data: {
            answer: result.answer,
            sessionId: result.sessionId,
            isOutOfScope: result.isOutOfScope,
            isActionResponse: result.isActionResponse,
            actionResult: result.actionResult,
            sources: result.sources.map(s => ({
              contentType: s.contentType,
              title: s.title,
              sourceId: s.sourceId,
            })),
          },
        });
      } catch (error) {
        console.error('Agent query error:', error);
        return reply.status(500).send({
          success: false,
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * POST /api/agent/execute
   * Execute a specific action through the agent
   */
  fastify.post<{ Body: ExecuteActionBody }>(
    '/api/agent/execute',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'userId', 'action'],
          properties: {
            organizationId: { type: 'string' },
            userId: { type: 'string' },
            userName: { type: 'string' },
            action: { type: 'string', minLength: 1, maxLength: 2000 },
            enabledToolCategories: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.keys(toolCategories),
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  response: { type: 'string' },
                  toolsUsed: { type: 'array', items: { type: 'string' } },
                  iterations: { type: 'number' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ExecuteActionBody }>, reply: FastifyReply) => {
      try {
        const { organizationId, userId, userName, action, enabledToolCategories } = request.body;

        const result = await executeAgentAction(
          action,
          organizationId,
          userId,
          userName,
          enabledToolCategories
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('Agent execute error:', error);
        return reply.status(500).send({
          success: false,
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * GET /api/agent/tools
   * List available tools
   */
  fastify.get(
    '/api/agent/tools',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: Object.keys(toolCategories),
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  categories: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  tools: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        category: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { category?: string } }>, reply: FastifyReply) => {
      const { category } = request.query;

      const categories = Object.keys(toolCategories);
      const tools: { name: string; description: string; category: string }[] = [];

      for (const cat of categories) {
        if (category && cat !== category) continue;

        const categoryTools = toolCategories[cat as keyof typeof toolCategories];
        for (const tool of categoryTools) {
          tools.push({
            name: tool.name,
            description: tool.description,
            category: cat,
          });
        }
      }

      return reply.send({
        success: true,
        data: {
          categories,
          tools,
        },
      });
    }
  );

  /**
   * GET /api/agent/tools/:toolName
   * Get details of a specific tool
   */
  fastify.get<{ Params: ToolInfoParams }>(
    '/api/agent/tools/:toolName',
    {
      schema: {
        params: {
          type: 'object',
          required: ['toolName'],
          properties: {
            toolName: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: ToolInfoParams }>, reply: FastifyReply) => {
      const { toolName } = request.params;
      const description = getToolDescription(toolName);

      if (!description) {
        return reply.status(404).send({
          success: false,
          error: `Tool "${toolName}" not found`,
        });
      }

      // Find the category for this tool
      let toolCategory = 'unknown';
      for (const [cat, tools] of Object.entries(toolCategories)) {
        if (tools.some(t => t.name === toolName)) {
          toolCategory = cat;
          break;
        }
      }

      return reply.send({
        success: true,
        data: {
          name: toolName,
          description,
          category: toolCategory,
        },
      });
    }
  );

  /**
   * GET /api/agent/capabilities
   * Get agent capabilities for a user/organization context
   */
  fastify.get(
    '/api/agent/capabilities',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            organizationId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { organizationId?: string; userId?: string } }>, reply: FastifyReply) => {
      const { organizationId, userId } = request.query;

      const config = {
        organizationId: organizationId || 'default',
        userId: userId || 'default',
      };

      const availableTools = getAvailableToolNames(config);

      return reply.send({
        success: true,
        data: {
          capabilities: {
            canCreateProjects: availableTools.includes('create_project'),
            canManageTasks: availableTools.includes('create_task') && availableTools.includes('update_task'),
            canManageClients: availableTools.includes('create_client'),
            canManageTeams: availableTools.includes('create_team'),
            canSendNotifications: availableTools.includes('send_notification'),
            canSendMessages: availableTools.includes('send_message'),
            canCreateDocuments: availableTools.includes('create_document'),
          },
          toolCount: availableTools.length,
          categories: Object.keys(toolCategories),
        },
      });
    }
  );
}
