/**
 * Export all LangChain tools
 */
export * from './project-management.tools';
export * from './client-management.tools';
export * from './workforce-management.tools';
export * from './communication.tools';
export * from './notification.tools';
export * from './knowledge-hub.tools';

import { projectManagementTools } from './project-management.tools';
import { clientManagementTools } from './client-management.tools';
import { workforceManagementTools } from './workforce-management.tools';
import { communicationTools } from './communication.tools';
import { notificationTools } from './notification.tools';
import { knowledgeHubTools } from './knowledge-hub.tools';

/**
 * All available tools organized by category
 */
export const toolCategories = {
  projectManagement: projectManagementTools,
  clientManagement: clientManagementTools,
  workforceManagement: workforceManagementTools,
  communication: communicationTools,
  notification: notificationTools,
  knowledgeHub: knowledgeHubTools,
};

/**
 * All tools flattened into a single array
 */
export const allTools = [
  ...projectManagementTools,
  ...clientManagementTools,
  ...workforceManagementTools,
  ...communicationTools,
  ...notificationTools,
  ...knowledgeHubTools,
];

/**
 * Get tools by category
 */
export function getToolsByCategory(category: keyof typeof toolCategories) {
  return toolCategories[category] || [];
}

/**
 * Get tool by name
 */
export function getToolByName(name: string) {
  return allTools.find(tool => tool.name === name);
}
