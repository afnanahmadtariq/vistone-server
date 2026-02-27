/**
 * LangChain Tool Definitions for Project Management Service
 * These tools allow the AI agent to interact with the project management service
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { projectConnector } from '../../grpc';

/**
 * Tool to create a new project
 */
export const createProjectTool = new DynamicStructuredTool({
  name: 'create_project',
  description: 'Create a new project in the organization. Use this when the user asks to create, add, or start a new project.',
  schema: z.object({
    organizationId: z.string().describe('The ID of the organization to create the project in'),
    name: z.string().describe('The name of the project'),
    description: z.string().optional().describe('A description of the project'),
    status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional().default('planned').describe('The initial status of the project'),
    startDate: z.string().optional().describe('The start date in ISO format (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('The end date in ISO format (YYYY-MM-DD)'),
    budget: z.number().optional().describe('The budget for the project'),
    managerId: z.string().optional().describe('The ID of the project manager'),
    clientId: z.string().optional().describe('The ID of the client this project is for'),
  }),
  func: async (input) => {
    const result = await projectConnector.createProject(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created project "${input.name}"`,
        project: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to get project details
 */
export const getProjectTool = new DynamicStructuredTool({
  name: 'get_project',
  description: 'Get details of a specific project by its ID. Use this to look up project information.',
  schema: z.object({
    projectId: z.string().describe('The ID of the project to retrieve'),
  }),
  func: async ({ projectId }) => {
    const result = await projectConnector.getProject(projectId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        project: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to update a project
 */
export const updateProjectTool = new DynamicStructuredTool({
  name: 'update_project',
  description: 'Update an existing project. Use this to modify project details, status, or other properties.',
  schema: z.object({
    projectId: z.string().describe('The ID of the project to update'),
    name: z.string().optional().describe('New name for the project'),
    description: z.string().optional().describe('New description'),
    status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional().describe('New status'),
    startDate: z.string().optional().describe('New start date'),
    endDate: z.string().optional().describe('New end date'),
    budget: z.number().optional().describe('New budget'),
    progress: z.number().min(0).max(100).optional().describe('Project progress percentage (0-100)'),
    managerId: z.string().optional().describe('New project manager ID'),
  }),
  func: async ({ projectId, ...updates }) => {
    const result = await projectConnector.updateProject(projectId, updates);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully updated project`,
        project: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list projects
 */
export const listProjectsTool = new DynamicStructuredTool({
  name: 'list_projects',
  description: 'List all projects in an organization. First try without a search term to see all projects, then use search to filter. The search is case-insensitive and matches partial project names.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID to list projects for'),
    status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional().describe('Filter by project status'),
    search: z.string().optional().describe('Optional search term to filter projects by name (case-insensitive, partial match)'),
  }),
  func: async (input) => {
    // First, get all projects for the organization
    const result = await projectConnector.listProjects({
      organizationId: input.organizationId,
      status: input.status,
      // Only pass search if explicitly provided
      search: input.search,
    });

    if (result.success) {
      let projects = result.data || [];

      // If search term provided but API returned empty, try fuzzy matching on all projects
      if (input.search && projects.length === 0) {
        // Get all projects without search filter
        const allProjectsResult = await projectConnector.listProjects({
          organizationId: input.organizationId,
          status: input.status,
        });

        if (allProjectsResult.success && allProjectsResult.data) {
          // Perform case-insensitive fuzzy matching
          const searchLower = input.search.toLowerCase();
          projects = allProjectsResult.data.filter((p: any) => {
            const nameLower = (p.name || '').toLowerCase();
            const descLower = (p.description || '').toLowerCase();
            return nameLower.includes(searchLower) ||
              descLower.includes(searchLower) ||
              searchLower.split(' ').some((word: string) => nameLower.includes(word));
          });
        }
      }

      return JSON.stringify({
        success: true,
        count: projects.length,
        projects: projects.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          progress: p.progress,
          startDate: p.startDate,
          endDate: p.endDate,
        })),
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});


/**
 * Tool to create a new task
 */
export const createTaskTool = new DynamicStructuredTool({
  name: 'create_task',
  description: 'Create a new task within a project. Use this when the user asks to add, create, or assign a new task.',
  schema: z.object({
    projectId: z.string().describe('The ID of the project to add the task to'),
    title: z.string().describe('The title of the task'),
    description: z.string().optional().describe('A detailed description of the task'),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional().default('todo').describe('The initial status'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('The priority level'),
    dueDate: z.string().optional().describe('The due date in ISO format (YYYY-MM-DD)'),
    assigneeId: z.string().optional().describe('The ID of the user to assign the task to'),
    estimatedHours: z.number().optional().describe('Estimated hours to complete the task'),
  }),
  func: async (input) => {
    const result = await projectConnector.createTask(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created task "${input.title}"`,
        task: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to get task details
 */
export const getTaskTool = new DynamicStructuredTool({
  name: 'get_task',
  description: 'Get details of a specific task by its ID.',
  schema: z.object({
    taskId: z.string().describe('The ID of the task to retrieve'),
  }),
  func: async ({ taskId }) => {
    const result = await projectConnector.getTask(taskId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        task: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to update a task
 */
export const updateTaskTool = new DynamicStructuredTool({
  name: 'update_task',
  description: 'Update an existing task. Use this to change task status, priority, assignee, or other properties.',
  schema: z.object({
    taskId: z.string().describe('The ID of the task to update'),
    title: z.string().optional().describe('New title'),
    description: z.string().optional().describe('New description'),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional().describe('New status'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('New priority'),
    dueDate: z.string().optional().describe('New due date'),
    assigneeId: z.string().optional().describe('New assignee ID'),
    estimatedHours: z.number().optional().describe('New estimated hours'),
    actualHours: z.number().optional().describe('Actual hours spent'),
  }),
  func: async ({ taskId, ...updates }) => {
    const result = await projectConnector.updateTask(taskId, updates);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully updated task`,
        task: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list tasks
 */
export const listTasksTool = new DynamicStructuredTool({
  name: 'list_tasks',
  description: 'List tasks. Can filter by project, assignee, or status.',
  schema: z.object({
    projectId: z.string().optional().describe('Filter by project ID'),
    assigneeId: z.string().optional().describe('Filter by assignee ID'),
    status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional().describe('Filter by status'),
  }),
  func: async (input) => {
    const result = await projectConnector.listTasks(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        tasks: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to create a milestone
 */
export const createMilestoneTool = new DynamicStructuredTool({
  name: 'create_milestone',
  description: 'Create a new milestone for a project. Milestones mark important points or deliverables in a project.',
  schema: z.object({
    projectId: z.string().describe('The ID of the project'),
    name: z.string().describe('The name of the milestone'),
    description: z.string().optional().describe('Description of the milestone'),
    dueDate: z.string().optional().describe('The due date in ISO format'),
    status: z.enum(['pending', 'in_progress', 'completed', 'missed']).optional().default('pending').describe('The status'),
  }),
  func: async (input) => {
    const result = await projectConnector.createMilestone(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created milestone "${input.name}"`,
        milestone: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list milestones
 */
export const listMilestonesTool = new DynamicStructuredTool({
  name: 'list_milestones',
  description: 'List all milestones for a project.',
  schema: z.object({
    projectId: z.string().describe('The project ID to list milestones for'),
  }),
  func: async ({ projectId }) => {
    const result = await projectConnector.listMilestones(projectId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        milestones: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

// Export all project management tools
export const projectManagementTools = [
  createProjectTool,
  getProjectTool,
  updateProjectTool,
  listProjectsTool,
  createTaskTool,
  getTaskTool,
  updateTaskTool,
  listTasksTool,
  createMilestoneTool,
  listMilestonesTool,
];
