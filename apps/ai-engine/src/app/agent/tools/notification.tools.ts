/**
 * LangChain Tool Definitions for Notification Service
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { notificationConnector } from '../../grpc';

/**
 * Tool to send a notification
 */
export const sendNotificationTool = new DynamicStructuredTool({
  name: 'send_notification',
  description: 'Send a notification to a specific user.',
  schema: z.object({
    userId: z.string().describe('The ID of the user to notify'),
    type: z.enum(['info', 'success', 'warning', 'error', 'task', 'mention', 'reminder']).describe('Type of notification'),
    title: z.string().describe('Notification title'),
    message: z.string().describe('Notification message'),
    priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Priority level'),
    actionUrl: z.string().optional().describe('URL to navigate when notification is clicked'),
  }),
  func: async (input) => {
    const result = await notificationConnector.sendNotification(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Notification sent to user`,
        notification: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to list notifications
 */
export const listNotificationsTool = new DynamicStructuredTool({
  name: 'list_notifications',
  description: 'List notifications for a user.',
  schema: z.object({
    userId: z.string().describe('The user ID'),
    unreadOnly: z.boolean().optional().default(false).describe('Only return unread notifications'),
  }),
  func: async ({ userId, unreadOnly }) => {
    const result = await notificationConnector.listNotifications(userId, unreadOnly);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        notifications: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to mark notification as read
 */
export const markNotificationReadTool = new DynamicStructuredTool({
  name: 'mark_notification_read',
  description: 'Mark a notification as read.',
  schema: z.object({
    notificationId: z.string().describe('The notification ID'),
  }),
  func: async ({ notificationId }) => {
    const result = await notificationConnector.markAsRead(notificationId);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Notification marked as read`,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to send bulk notifications
 */
export const sendBulkNotificationTool = new DynamicStructuredTool({
  name: 'send_bulk_notification',
  description: 'Send notifications to multiple users at once.',
  schema: z.object({
    userIds: z.array(z.string()).describe('Array of user IDs to notify'),
    type: z.enum(['info', 'success', 'warning', 'error', 'task', 'mention', 'reminder']).describe('Type of notification'),
    title: z.string().describe('Notification title'),
    message: z.string().describe('Notification message'),
    priority: z.enum(['low', 'normal', 'high']).optional().default('normal').describe('Priority level'),
  }),
  func: async (input) => {
    const result = await notificationConnector.sendBulkNotification(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Bulk notifications sent`,
        result: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

// Export all notification tools
export const notificationTools = [
  sendNotificationTool,
  listNotificationsTool,
  markNotificationReadTool,
  sendBulkNotificationTool,
];
