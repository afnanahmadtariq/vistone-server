/**
 * Client↔organizer workspace automation: tasks, milestones, skill/load-based assignment.
 * Uses org settings under settings.autoAgent and the existing agent tool loop.
 */
import type { AuthenticatedUser } from '../types';
import { describePermissions } from './rbac.service';
import {
  searchSimilar,
  buildContext,
  extractSources,
  getConversationHistory,
  saveToHistory,
} from './rag.service';
import { communicationClient, knowledgeClient, safeCall } from './connectors';
import { getOrgAutoAgentSettings } from './org-settings.service';
import { buildOrganizationOverviewForPrompt } from './org-context.service';
import {
  resolveAutoAgentPipeline,
} from '../../lib/org-auto-agent-settings';
import { v4 as uuidv4 } from 'uuid';

async function fetchChannelSummary(channelId: string): Promise<{
  type?: string;
  projectId?: string;
  syncWikiId?: string;
  name?: string;
} | null> {
  const r = await safeCall(() => communicationClient().get(`/chat-channels/${channelId}`));
  if (!r.success || !r.data || typeof r.data !== 'object') return null;
  return r.data as {
    type?: string;
    projectId?: string;
    syncWikiId?: string;
    name?: string;
  };
}

async function fetchRecentMessagesSnippet(channelId: string, limit = 40): Promise<string> {
  const r = await safeCall(() =>
    communicationClient().get(`/chat-messages?channelId=${encodeURIComponent(channelId)}&limit=${limit}`)
  );
  if (!r.success || !Array.isArray(r.data)) return '(no messages)';
  const lines: string[] = [];
  for (const m of r.data as Array<{ content?: string; createdAt?: string; senderId?: string }>) {
    const c = typeof m.content === 'string' ? m.content.trim() : '';
    if (c) lines.push(`- ${c.slice(0, 500)}${c.length > 500 ? '…' : ''}`);
  }
  return lines.length ? lines.join('\n') : '(no text content)';
}

async function fetchWikiDocsSnippet(wikiId: string): Promise<string> {
  const r = await safeCall(() =>
    knowledgeClient().get(`/documents?wikiId=${encodeURIComponent(wikiId)}&includeAll=true`)
  );
  if (!r.success || !Array.isArray(r.data)) return '(no wiki documents)';
  const names = (r.data as Array<{ name?: string }>)
    .map((d) => d.name)
    .filter((n): n is string => typeof n === 'string' && !!n.trim());
  return names.length ? `Files in linked wiki: ${names.slice(0, 40).join(', ')}` : '(empty wiki)';
}

function buildAutomationQuery(params: {
  projectId: string;
  channelId: string;
  channelNotes: string;
  messagesSnippet: string;
  wikiSnippet: string;
  pipeline: ReturnType<typeof resolveAutoAgentPipeline>;
}): string {
  const steps: string[] = [];
  if (params.pipeline.runTasks) {
    steps.push(
      '1) From the CLIENT WORKSPACE context below, infer concrete new requirements and create project tasks (titles, descriptions, priorities). Use create_task for projectId=' +
        params.projectId +
        '.',
    );
  }
  if (params.pipeline.runMilestones) {
    steps.push(
      '2) Based on existing and newly created tasks for this project, create or update milestones with create_milestone (logical groupings, due dates where sensible). Use list_tasks and list_milestones first.',
    );
  }
  if (params.pipeline.runAssign) {
    steps.push(
      '3) For tasks that are still unassigned (or need better owners), assign them: use list_tasks, then for candidate members use get_user_skills and compare task titles/descriptions to skill names. Prefer assignees with fewer open tasks (list_tasks by assigneeId). Use update_task to set assigneeId.',
    );
  }

  return `AUTOMATION RUN (client workspace)
projectId=${params.projectId}
channelId=${params.channelId}

Channel: ${params.channelNotes}

Recent client/organizer messages (may include requirements):
${params.messagesSnippet}

Linked wiki documents (names):
${params.wikiSnippet}

Execute in order:
${steps.join('\n')}

Summarize tasks, milestones, and assignments you created or updated.`;
}

function buildAutomationSystemPrompt(
  user: AuthenticatedUser,
  ragContext: string,
  orgOverview: string
): string {
  const userName = user.name || user.firstName || user.email;
  const permSummary = describePermissions(user);
  return `You are Vistone workspace automation for ${user.organizationName || 'the organization'}.

Current user (runner): ${userName} (${user.id}), role ${user.role}.
${permSummary}

ORGANIZATION SNAPSHOT (high-level; use tools for tasks, users, detailed project state):
${orgOverview || '(unavailable)'}

CLIENT WORKSPACE AUTOMATION RULES:
- You are acting on behalf of an organizer who enabled automation in organization settings.
- Only use data and tools permitted for this user. Stay within projectId and organization scope.
- The channel is the dedicated client↔organizer workspace; treat message text as potential client requirements.
- When wiki file names are listed, use them as context for what was already shared; use list_messages if you need more.
- Do not delete projects, clients, or wiki content unless explicitly required (prefer create/update only).
- Be conservative: if requirements are ambiguous, create fewer, clearer tasks rather than many vague ones.

RETRIEVED RAG CONTEXT:
${ragContext || 'None.'}`;
}

export interface ClientWorkspaceAutoAgentResult {
  success: boolean;
  answer?: string;
  sessionId: string;
  error?: string;
  sources?: { contentType: string; title: string; sourceId: string }[];
  actionResult?: { success: boolean; toolsUsed: string[]; iterations: number };
  skippedReason?: string;
  pendingAction?: { description: string; tools: string[]; originalQuery: string };
}

export async function runClientWorkspaceAutoAgentPipeline(
  user: AuthenticatedUser,
  body: { projectId: string; channelId: string; organizationId?: string; forceExecute?: boolean }
): Promise<ClientWorkspaceAutoAgentResult> {
  const organizationId = (body.organizationId || user.organizationId || '').trim();
  if (!organizationId) {
    return { success: false, sessionId: '', error: 'organizationId is required' };
  }
  if (organizationId !== user.organizationId.trim()) {
    return { success: false, sessionId: '', error: 'Organization mismatch' };
  }

  const auto = await getOrgAutoAgentSettings(organizationId);
  const pipeline = resolveAutoAgentPipeline(auto);
  if (!pipeline.runTasks && !pipeline.runMilestones && !pipeline.runAssign) {
    return {
      success: false,
      sessionId: '',
      error: 'No automation steps are enabled in Organization → Automation settings.',
      skippedReason: 'all_steps_disabled',
    };
  }

  const channel = await fetchChannelSummary(body.channelId);
  if (!channel) {
    return { success: false, sessionId: '', error: 'Channel not found' };
  }
  if (channel.type !== 'client_workspace') {
    return { success: false, sessionId: '', error: 'Channel must be a client_workspace channel' };
  }
  if (!channel.projectId || channel.projectId !== body.projectId) {
    return { success: false, sessionId: '', error: 'Channel must belong to the given projectId' };
  }

  const [messagesSnippet, wikiSnippet] = await Promise.all([
    fetchRecentMessagesSnippet(body.channelId),
    channel.syncWikiId
      ? fetchWikiDocsSnippet(channel.syncWikiId)
      : Promise.resolve('(no sync wiki on channel)'),
  ]);

  const queryText = buildAutomationQuery({
    projectId: body.projectId,
    channelId: body.channelId,
    channelNotes: [channel.name, channel.syncWikiId ? `syncWikiId=${channel.syncWikiId}` : '']
      .filter(Boolean)
      .join(' | '),
    messagesSnippet,
    wikiSnippet,
    pipeline,
  });

  const [similarDocs, orgOverview] = await Promise.all([
    searchSimilar(user, queryText),
    buildOrganizationOverviewForPrompt(user),
  ]);
  const ragContext = buildContext(similarDocs);
  const sources = extractSources(similarDocs);
  const systemPrompt = buildAutomationSystemPrompt(user, ragContext, orgOverview);
  const sessionId = uuidv4();
  const history = await getConversationHistory(sessionId);

  const { runAgent, planAgent, isWriteTool } = await import('../agent/runner.js');

  if (!pipeline.skipUserConfirmation && !body.forceExecute) {
    const plan = await planAgent(user, queryText, systemPrompt, history);
    const hasWrite = plan.tools.some(isWriteTool);
    if (hasWrite) {
      await saveToHistory(user.organizationId, user.id, sessionId, 'user', queryText);
      await saveToHistory(user.organizationId, user.id, sessionId, 'assistant', plan.description, {
        pendingAction: { description: plan.description, tools: plan.tools, originalQuery: queryText },
      });
      return {
        success: true,
        sessionId,
        answer: plan.description,
        sources,
        skippedReason: 'pending_confirmation',
        pendingAction: {
          description: plan.description,
          tools: plan.tools,
          originalQuery: queryText,
        },
      };
    }
  }

  const result = await runAgent(user, queryText, systemPrompt, history, false);

  await saveToHistory(user.organizationId, user.id, sessionId, 'user', queryText);
  await saveToHistory(user.organizationId, user.id, sessionId, 'assistant', result.response, {
    sources,
    actionResult: {
      success: result.success,
      toolsUsed: result.toolsUsed,
      iterations: result.iterations,
    },
  });

  return {
    success: result.success,
    sessionId,
    answer: result.response,
    sources,
    actionResult: {
      success: result.success,
      toolsUsed: result.toolsUsed,
      iterations: result.iterations,
    },
  };
}
