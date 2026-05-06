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
import { createHash } from 'node:crypto';
import { assessClientWorkspaceMessageClarity } from './client-workspace-clarity.service';

const CLARIFICATION_DEDUPE_TTL_MS = 60_000;
const postedClarificationCache = new Map<string, number>();

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

async function fetchRecentMessages(channelId: string, limit = 40): Promise<string[]> {
  const r = await safeCall(() =>
    communicationClient().get(`/chat-messages?channelId=${encodeURIComponent(channelId)}&limit=${limit}`)
  );
  if (!r.success || !Array.isArray(r.data)) return [];
  const lines: string[] = [];
  for (const m of r.data as Array<{ content?: string }>) {
    const c = typeof m.content === 'string' ? m.content.trim() : '';
    if (c) lines.push(c);
  }
  return lines;
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
      '1) From the CLIENT WORKSPACE context below, extract concrete deliverables/requirements from the client\'s latest message(s) and convert them into project tasks (title, description, priority) strictly based on those requirements. Use create_task for projectId=' +
        params.projectId +
        ' exactly. Do not create tasks for any other projectId.',
    );
  }
  if (params.pipeline.runMilestones) {
    steps.push(
      '2) Based on existing and newly created tasks for this project, create or update milestones with create_milestone (logical groupings, due dates where sensible). Use list_tasks with projectId=' +
        params.projectId +
        ' and list_milestones for the same project first, then call create_milestone with projectId=' +
        params.projectId +
        ' exactly.',
    );
  }
  if (params.pipeline.runAssign) {
    steps.push(
      '3) For tasks that are still unassigned (or need better owners), assign them: use list_tasks with projectId=' +
        params.projectId +
        ', then for candidate members use get_user_skills and compare task titles/descriptions to skill names. Prefer assignees with fewer open tasks (list_tasks by assigneeId). Use update_task to set assigneeId for tasks from this project only.',
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
- Hard constraint: every write MUST target the provided projectId only.
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

function shouldSkipClarificationPost(dedupeKey: string): boolean {
  const now = Date.now();
  const expiresAt = postedClarificationCache.get(dedupeKey) ?? 0;
  if (expiresAt > now) return true;
  postedClarificationCache.set(dedupeKey, now + CLARIFICATION_DEDUPE_TTL_MS);
  return false;
}

async function postClarificationQuestions(params: {
  channelId: string;
  senderId: string;
  questions: string[];
}): Promise<void> {
  const questionLines = params.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const content =
    `Thanks for the update. To proceed safely, I need a bit more detail before creating tasks:\n\n` +
    `${questionLines}\n\n` +
    `Please reply in this channel and I will continue automation.`;
  await safeCall(() =>
    communicationClient().post('/messages', {
      channelId: params.channelId,
      senderId: params.senderId,
      type: 'system',
      content,
      mentions: [],
      attachments: [],
    })
  );
}

function hasCreationFromAutomation(toolsUsed: string[]): boolean {
  const toolSet = new Set(toolsUsed);
  return (
    toolSet.has('create_project') ||
    toolSet.has('create_task') ||
    toolSet.has('create_milestone')
  );
}

async function postAutomationConfirmation(params: {
  channelId: string;
  senderId: string;
  summary: string;
}): Promise<void> {
  const content =
    `Automation update: I created items from the latest client requirements.\n\n` +
    `${params.summary}`;
  await safeCall(() =>
    communicationClient().post('/messages', {
      channelId: params.channelId,
      senderId: params.senderId,
      type: 'system',
      content,
      mentions: [],
      attachments: [],
    })
  );
}

export async function runClientWorkspaceAutoAgentPipeline(
  user: AuthenticatedUser,
  body: {
    projectId: string;
    channelId: string;
    organizationId?: string;
    forceExecute?: boolean;
    triggerSource?: 'auto' | 'manual';
  }
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

  const [messageTexts, wikiSnippet] = await Promise.all([
    fetchRecentMessages(body.channelId),
    channel.syncWikiId
      ? fetchWikiDocsSnippet(channel.syncWikiId)
      : Promise.resolve('(no sync wiki on channel)'),
  ]);
  const messagesSnippet =
    messageTexts.length > 0
      ? messageTexts
          .slice(-40)
          .map((c) => `- ${c.slice(0, 500)}${c.length > 500 ? '…' : ''}`)
          .join('\n')
      : '(no text content)';
  const latestMessage = messageTexts[messageTexts.length - 1] ?? '';
  const isAutoTriggered = body.triggerSource === 'auto';

  if (isAutoTriggered) {
    const clarity = await assessClientWorkspaceMessageClarity({
      latestMessage,
      messagesSnippet,
      wikiSnippet,
      projectId: body.projectId,
    });
    if (!clarity.isClear) {
      const dedupeKey = createHash('sha256')
        .update(`${body.channelId}|${latestMessage}|${clarity.questions.join('|')}`)
        .digest('hex');
      if (!shouldSkipClarificationPost(dedupeKey)) {
        await postClarificationQuestions({
          channelId: body.channelId,
          senderId: user.id,
          questions:
            clarity.questions.length > 0
              ? clarity.questions
              : ['Could you clarify the requirement in more detail so we can proceed?'],
        });
      }
      return {
        success: true,
        sessionId: '',
        skippedReason: 'needs_clarification',
        answer: `Automation paused: clarification requested (${clarity.reason}).`,
      };
    }
  }

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

  const shouldPlanForConfirmation =
    !pipeline.skipUserConfirmation && !body.forceExecute && !isAutoTriggered;
  if (shouldPlanForConfirmation) {
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

  if (isAutoTriggered && result.success && hasCreationFromAutomation(result.toolsUsed)) {
    await postAutomationConfirmation({
      channelId: body.channelId,
      senderId: user.id,
      summary: result.response || 'Created project tasks/milestones successfully.',
    });
  }

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
