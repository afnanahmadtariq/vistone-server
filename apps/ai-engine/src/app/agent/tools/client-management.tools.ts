/**
 * LangChain Tool Definitions for Client Management Service
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { clientConnector } from '../../grpc';

/**
 * Tool to create a new client
 */
export const createClientTool = new DynamicStructuredTool({
  name: 'create_client',
  description: 'Create a new client in the organization. Use this when adding a new customer or client.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    name: z.string().describe('The client name'),
    email: z.string().email().optional().describe('Client email address'),
    phone: z.string().optional().describe('Client phone number'),
    company: z.string().optional().describe('Company name'),
    industry: z.string().optional().describe('Industry sector'),
    status: z.enum(['active', 'inactive', 'prospect', 'churned']).optional().default('active').describe('Client status'),
    notes: z.string().optional().describe('Additional notes about the client'),
  }),
  func: async (input) => {
    const result = await clientConnector.createClient(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created client "${input.name}"`,
        client: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to get client details
 */
export const getClientTool = new DynamicStructuredTool({
  name: 'get_client',
  description: 'Get details of a specific client by their ID.',
  schema: z.object({
    clientId: z.string().describe('The ID of the client to retrieve'),
  }),
  func: async ({ clientId }) => {
    const result = await clientConnector.getClient(clientId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        client: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to update a client
 */
export const updateClientTool = new DynamicStructuredTool({
  name: 'update_client',
  description: 'Update an existing client record.',
  schema: z.object({
    clientId: z.string().describe('The ID of the client to update'),
    name: z.string().optional().describe('New name'),
    email: z.string().email().optional().describe('New email'),
    phone: z.string().optional().describe('New phone'),
    company: z.string().optional().describe('New company'),
    industry: z.string().optional().describe('New industry'),
    status: z.enum(['active', 'inactive', 'prospect', 'churned']).optional().describe('New status'),
    notes: z.string().optional().describe('New notes'),
  }),
  func: async ({ clientId, ...updates }) => {
    const result = await clientConnector.updateClient(clientId, updates);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully updated client`,
        client: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list clients
 */
export const listClientsTool = new DynamicStructuredTool({
  name: 'list_clients',
  description: 'List all clients in an organization. Can filter by status or search by name.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    status: z.enum(['active', 'inactive', 'prospect', 'churned']).optional().describe('Filter by status'),
    search: z.string().optional().describe('Search term to filter by name'),
  }),
  func: async (input) => {
    const result = await clientConnector.listClients(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        clients: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to create a proposal
 */
export const createProposalTool = new DynamicStructuredTool({
  name: 'create_proposal',
  description: 'Create a new proposal for a client. Proposals are formal offers for projects or services.',
  schema: z.object({
    clientId: z.string().describe('The client ID'),
    organizationId: z.string().describe('The organization ID'),
    title: z.string().describe('The proposal title'),
    description: z.string().optional().describe('Detailed description of the proposal'),
    amount: z.number().optional().describe('The proposed amount/price'),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional().default('draft').describe('Proposal status'),
    validUntil: z.string().optional().describe('Expiry date in ISO format'),
    createdById: z.string().optional().describe('ID of the user creating the proposal'),
  }),
  func: async (input) => {
    const result = await clientConnector.createProposal(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created proposal "${input.title}"`,
        proposal: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list proposals
 */
export const listProposalsTool = new DynamicStructuredTool({
  name: 'list_proposals',
  description: 'List proposals. Can filter by client or status.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    clientId: z.string().optional().describe('Filter by client ID'),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional().describe('Filter by status'),
  }),
  func: async (input) => {
    const result = await clientConnector.listProposals(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        proposals: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

// Export all client management tools
export const clientManagementTools = [
  createClientTool,
  getClientTool,
  updateClientTool,
  listClientsTool,
  createProposalTool,
  listProposalsTool,
];
