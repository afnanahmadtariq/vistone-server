import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ragConfig } from '../config';

/**
 * Split text into chunks for embedding
 */
export function createTextSplitter(): RecursiveCharacterTextSplitter {
  return new RecursiveCharacterTextSplitter({
    chunkSize: ragConfig.embedding.chunkSize,
    chunkOverlap: ragConfig.embedding.chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });
}

/**
 * Split a document into chunks
 */
export async function splitText(text: string): Promise<string[]> {
  const splitter = createTextSplitter();
  const chunks = await splitter.splitText(text);
  return chunks;
}

/**
 * Create a content hash for change detection
 */
export function createContentHash(content: string): string {
  // Simple hash for content comparison
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Prepare document content for indexing
 */
export function prepareDocumentContent(
  title: string,
  content: string,
  metadata?: Record<string, unknown>
): string {
  const parts: string[] = [`Title: ${title}`];
  
  if (metadata) {
    // Add relevant metadata to the searchable content
    if (metadata.status) parts.push(`Status: ${metadata.status}`);
    if (metadata.priority) parts.push(`Priority: ${metadata.priority}`);
    if (metadata.assignee) parts.push(`Assignee: ${metadata.assignee}`);
    if (metadata.dueDate) parts.push(`Due Date: ${metadata.dueDate}`);
    if (metadata.projectName) parts.push(`Project: ${metadata.projectName}`);
    if (metadata.teamName) parts.push(`Team: ${metadata.teamName}`);
    
    // Add count/statistics metadata for better aggregate query matching
    if (metadata.memberCount !== undefined) parts.push(`Total Members: ${metadata.memberCount}`);
    if (metadata.projectCount !== undefined) parts.push(`Total Projects: ${metadata.projectCount}`);
    if (metadata.taskCount !== undefined) parts.push(`Total Tasks: ${metadata.taskCount}`);
    if (metadata.teamCount !== undefined) parts.push(`Total Teams: ${metadata.teamCount}`);
    if (metadata.clientCount !== undefined) parts.push(`Total Clients: ${metadata.clientCount}`);
    if (metadata.milestoneCount !== undefined) parts.push(`Total Milestones: ${metadata.milestoneCount}`);
  }
  
  parts.push(`\nContent:\n${content}`);
  
  return parts.join('\n');
}
