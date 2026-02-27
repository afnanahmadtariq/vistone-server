/**
 * LangChain Tool Definitions for Knowledge Hub Service
 */
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { knowledgeConnector } from '../../grpc';

/**
 * Tool to create a document
 */
export const createDocumentTool = new DynamicStructuredTool({
  name: 'create_document',
  description: 'Create a new document in the knowledge hub.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    title: z.string().describe('Document title'),
    content: z.string().describe('Document content'),
    category: z.string().optional().describe('Document category'),
    tags: z.array(z.string()).optional().describe('Tags for the document'),
    createdById: z.string().describe('ID of the user creating the document'),
  }),
  func: async (input) => {
    const result = await knowledgeConnector.createDocument(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created document "${input.title}"`,
        document: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to search documents
 */
export const searchDocumentsTool = new DynamicStructuredTool({
  name: 'search_documents',
  description: 'Search for documents in the knowledge hub.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    query: z.string().describe('Search query'),
    category: z.string().optional().describe('Filter by category'),
  }),
  func: async (input) => {
    const result = await knowledgeConnector.searchDocuments(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        count: result.data?.length || 0,
        documents: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

/**
 * Tool to create a wiki page
 */
export const createWikiPageTool = new DynamicStructuredTool({
  name: 'create_wiki_page',
  description: 'Create a new wiki page in the knowledge hub.',
  schema: z.object({
    organizationId: z.string().describe('The organization ID'),
    title: z.string().describe('Wiki page title'),
    content: z.string().describe('Wiki page content in markdown format'),
    parentId: z.string().optional().describe('Parent page ID for nested pages'),
    createdById: z.string().describe('ID of the user creating the page'),
  }),
  func: async (input) => {
    const result = await knowledgeConnector.createWikiPage(input);
    if (result.success) {
      return JSON.stringify({
        success: true,
        message: `Successfully created wiki page "${input.title}"`,
        page: result.data,
      });
    }
    return JSON.stringify({
      success: false,
      error: result.error,
    });
  },
});

// Export all knowledge hub tools
export const knowledgeHubTools = [
  createDocumentTool,
  searchDocumentsTool,
  createWikiPageTool,
];
