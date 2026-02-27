/**
 * LangChain Tool Definitions for Workforce Management Service
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { workforceConnector } from '../../grpc';

/**
 * Tool to create a new team
 */
export const createTeamTool = new DynamicStructuredTool({
  name: 'create_team',
  description: 'Create a new team in the organization. Teams are groups of members working together.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    name: z.string().describe('The team name'),
    description: z.string().optional().describe('Team description'),
    leaderId: z.string().optional().describe('ID of the team leader'),
  }),
  func: async (input) => {
    const result = await workforceConnector.createTeam(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created team "${input.name}"`,
        team: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to get team details
 */
export const getTeamTool = new DynamicStructuredTool({
  name: 'get_team',
  description: 'Get details of a specific team by its ID.',
  schema: z.object({
    teamId: z.string().describe('The ID of the team to retrieve'),
  }),
  func: async ({ teamId }) => {
    const result = await workforceConnector.getTeam(teamId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        team: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list teams
 */
export const listTeamsTool = new DynamicStructuredTool({
  name: 'list_teams',
  description: 'List all teams in an organization.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    search: z.string().optional().describe('Search term to filter teams'),
  }),
  func: async (input) => {
    const result = await workforceConnector.listTeams(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        teams: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to add a team member
 */
export const addTeamMemberTool = new DynamicStructuredTool({
  name: 'add_team_member',
  description: 'Add a user to a team.',
  schema: z.object({
    teamId: z.string().describe('The team ID'),
    userId: z.string().describe('The user ID to add'),
    role: z.string().optional().describe('The role in the team (e.g., "member", "lead")'),
  }),
  func: async (input) => {
    const result = await workforceConnector.addTeamMember(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully added member to team`,
        member: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to get team members
 */
export const getTeamMembersTool = new DynamicStructuredTool({
  name: 'get_team_members',
  description: 'Get all members of a team.',
  schema: z.object({
    teamId: z.string().describe('The team ID'),
  }),
  func: async ({ teamId }) => {
    const result = await workforceConnector.getTeamMembers(teamId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        members: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to get user skills
 */
export const getUserSkillsTool = new DynamicStructuredTool({
  name: 'get_user_skills',
  description: 'Get all skills of a specific user.',
  schema: z.object({
    userId: z.string().describe('The user ID'),
  }),
  func: async ({ userId }) => {
    const result = await workforceConnector.getUserSkills(userId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        skills: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to add a user skill
 */
export const addUserSkillTool = new DynamicStructuredTool({
  name: 'add_user_skill',
  description: 'Add a skill to a user profile.',
  schema: z.object({
    userId: z.string().describe('The user ID'),
    skillName: z.string().describe('The name of the skill'),
    proficiencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional().describe('Skill proficiency level'),
    yearsOfExperience: z.number().optional().describe('Years of experience with this skill'),
  }),
  func: async (input) => {
    const result = await workforceConnector.addUserSkill(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully added skill "${input.skillName}"`,
        skill: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

// Export all workforce management tools
export const workforceManagementTools = [
  createTeamTool,
  getTeamTool,
  listTeamsTool,
  addTeamMemberTool,
  getTeamMembersTool,
  getUserSkillsTool,
  addUserSkillTool,
];
