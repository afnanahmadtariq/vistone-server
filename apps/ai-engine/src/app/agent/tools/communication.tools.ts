/**
 * LangChain Tool Definitions for Communication Service
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { communicationConnector } from '../../grpc';

/**
 * Tool to send a message
 */
export const sendMessageTool = new DynamicStructuredTool({
  name: 'send_message',
  description: 'Send a message to a channel. Use this to send messages on behalf of the user.',
  schema: z.object({
    channelId: z.string().describe('The channel ID to send the message to'),
    senderId: z.string().describe('The ID of the user sending the message'),
    content: z.string().describe('The message content'),
    messageType: z.enum(['text', 'file', 'image', 'system']).optional().default('text').describe('Type of message'),
  }),
  func: async (input) => {
    const result = await communicationConnector.sendMessage(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Message sent successfully`,
        messageData: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list messages
 */
export const listMessagesTool = new DynamicStructuredTool({
  name: 'list_messages',
  description: 'Get messages from a channel.',
  schema: z.object({
    channelId: z.string().describe('The channel ID'),
    limit: z.number().optional().default(50).describe('Maximum number of messages to retrieve'),
  }),
  func: async ({ channelId, limit }) => {
    const result = await communicationConnector.listMessages(channelId, limit);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        messages: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to create a channel
 */
export const createChannelTool = new DynamicStructuredTool({
  name: 'create_channel',
  description: 'Create a new communication channel for team discussions.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    name: z.string().describe('The channel name'),
    description: z.string().optional().describe('Channel description'),
    channelType: z.enum(['general', 'project', 'team', 'direct']).optional().default('general').describe('Type of channel'),
    isPrivate: z.boolean().optional().default(false).describe('Whether the channel is private'),
    memberIds: z.array(z.string()).optional().describe('Initial member IDs'),
    createdById: z.string().describe('ID of the user creating the channel'),
  }),
  func: async (input) => {
    const result = await communicationConnector.createChannel(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created channel "${input.name}"`,
        channel: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list channels
 */
export const listChannelsTool = new DynamicStructuredTool({
  name: 'list_channels',
  description: 'List communication channels.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    userId: z.string().optional().describe('Filter channels for a specific user'),
  }),
  func: async (input) => {
    const result = await communicationConnector.listChannels(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        channels: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to create an announcement
 */
export const createAnnouncementTool = new DynamicStructuredTool({
  name: 'create_announcement',
  description: 'Create an organization-wide announcement.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    title: z.string().describe('The announcement title'),
    content: z.string().describe('The announcement content'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal').describe('Priority level'),
    createdById: z.string().describe('ID of the user creating the announcement'),
    expiresAt: z.string().optional().describe('Expiry date in ISO format'),
  }),
  func: async (input) => {
    const result = await communicationConnector.createAnnouncement(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created announcement "${input.title}"`,
        announcement: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

// Export all communication tools
export const communicationTools = [
  sendMessageTool,
  listMessagesTool,
  createChannelTool,
  listChannelsTool,
  createAnnouncementTool,
];
