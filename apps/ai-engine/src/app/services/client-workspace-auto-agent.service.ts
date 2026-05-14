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
import { communicationClient, knowledgeClient, projectClient, workforceClient, safeCall } from './connectors';
import { getOrgAutoAgentSettings } from './org-settings.service';
import { buildOrganizationOverviewForPrompt } from './org-context.service';
import { presetAiDataScopeForClientWorkspaceChannel } from './access-scope.service';
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
    communicationClient().get(`/messages?channelId=${encodeURIComponent(channelId)}&limit=${limit}`)
  );
  if (!r.success || r.data == null) return [];
  const data = r.data as Record<string, unknown> | unknown[];
  const rawMessages = Array.isArray(data)
    ? data
    : Array.isArray((data as { messages?: unknown[] }).messages)
      ? ((data as { messages: unknown[] }).messages as unknown[])
      : [];
  const lines: string[] = [];
  for (const m of rawMessages) {
    const row = m && typeof m === 'object' ? (m as Record<string, unknown>) : {};
    const c = typeof row.content === 'string' ? row.content.trim() : '';
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

function clipStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/** Prefetch project, tasks, milestones, members, and skills so the agent starts aligned with live data. */
async function fetchProjectSnapshotText(projectId: string, organizationId: string): Promise<string> {
  const lines: string[] = [];
  const pr = await safeCall(() => projectClient().get(`/projects/${encodeURIComponent(projectId)}`));
  if (!pr.success || !pr.data || typeof pr.data !== 'object') {
    return 'PROJECT SNAPSHOT: (Could not prefetch project — use get_project in tools.)\n';
  }
  const p = pr.data as Record<string, unknown>;
  lines.push('═══ PROJECT SNAPSHOT (prefetched — verify with tools if needed) ═══');
  if (typeof p.name === 'string') lines.push(`Name: ${p.name}`);
  if (typeof p.description === 'string' && p.description.trim()) {
    lines.push(`Description:\n${clipStr(p.description.trim(), 1200)}`);
  }
  lines.push(
    `Status: ${String(p.status ?? '')} | Progress: ${String(p.progress ?? '')}% | Start: ${String(p.startDate ?? '')} | End: ${String(p.endDate ?? '')}`,
  );
  lines.push(
    `managerId: ${String(p.managerId ?? '')} | teamId: ${String(p.teamId ?? '')} | clientId: ${String(p.clientId ?? '')}`,
  );

  const tasksR = await safeCall(() =>
    projectClient().get(`/tasks?projectId=${encodeURIComponent(projectId)}`)
  );
  if (tasksR.success && Array.isArray(tasksR.data)) {
    const tasks = tasksR.data as Record<string, unknown>[];
    lines.push('');
    lines.push(
      `Existing tasks (${tasks.length}): align new work with these; avoid duplicate titles unless you are explicitly extending scope.`,
    );
    for (const t of tasks.slice(0, 45)) {
      const title = typeof t.title === 'string' ? t.title : '';
      lines.push(
        ` - ${clipStr(title, 140)} [id=${String(t.id)}] status=${String(t.status)} assignee=${String(t.assigneeId ?? 'none')} priority=${String(t.priority ?? '')}`,
      );
    }
    if (tasks.length > 45) lines.push(` … and ${tasks.length - 45} more (use list_tasks for detail).`);
  }

  const milR = await safeCall(() =>
    projectClient().get(
      `/milestones?projectId=${encodeURIComponent(projectId)}&organizationId=${encodeURIComponent(organizationId)}`
    )
  );
  if (milR.success && Array.isArray(milR.data)) {
    const ms = milR.data as Record<string, unknown>[];
    lines.push('');
    lines.push(`Milestones (${ms.length}):`);
    for (const m of ms.slice(0, 25)) {
      lines.push(
        ` - ${clipStr(String(m.title ?? ''), 100)} due=${String(m.dueDate ?? '')} status=${String(m.status ?? '')} id=${String(m.id ?? '')}`,
      );
    }
  }

  const memR = await safeCall(() =>
    projectClient().get(`/project-members?projectId=${encodeURIComponent(projectId)}`)
  );
  const memberIds: string[] = [];
  if (memR.success && Array.isArray(memR.data)) {
    const mems = memR.data as Record<string, unknown>[];
    lines.push('');
    lines.push(`Project members (${mems.length}):`);
    for (const m of mems.slice(0, 40)) {
      const uid = typeof m.userId === 'string' ? m.userId : '';
      if (uid) memberIds.push(uid);
      lines.push(` - userId=${uid} role=${String(m.role ?? '')}`);
    }
  }

  const uniqueMembers = [...new Set(memberIds)].slice(0, 14);
  if (uniqueMembers.length > 0) {
    lines.push('');
    lines.push('Member skills (for skill-based assignment):');
    for (const uid of uniqueMembers) {
      const sk = await safeCall(() => workforceClient().get(`/user-skills?userId=${encodeURIComponent(uid)}`));
      if (!sk.success || !Array.isArray(sk.data)) {
        lines.push(` - ${uid}: (skills unavailable)`);
        continue;
      }
      const skills = (sk.data as Record<string, unknown>[])
        .map((row) => {
          const n =
            typeof row.skillName === 'string'
              ? row.skillName.trim()
              : typeof row.name === 'string'
                ? row.name.trim()
                : '';
          const prof = row.proficiency;
          const p = typeof prof === 'number' && Number.isFinite(prof) ? ` (${prof})` : '';
          return n ? `${n}${p}` : '';
        })
        .filter(Boolean)
        .slice(0, 22);
      lines.push(` - ${uid}: ${skills.length ? skills.join(', ') : '(no skills recorded)'}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function buildAutomationQuery(params: {
  projectId: string;
  channelId: string;
  channelNotes: string;
  projectSnapshot: string;
  messagesSnippet: string;
  wikiSnippet: string;
  pipeline: ReturnType<typeof resolveAutoAgentPipeline>;
}): string {
  const rawSteps: string[] = [];
  if (params.pipeline.runTasks) {
    rawSteps.push(
      'Read the PROJECT SNAPSHOT, client messages, and wiki names. Derive concrete deliverables from the latest client request AND the project description. Cross-check existing tasks to avoid duplicates (extend existing tasks when appropriate instead of cloning). Use create_task with projectId=' +
        params.projectId +
        ' only. Prefer realistic titles, descriptions, and priorities.',
    );
  }
  if (params.pipeline.runMilestones) {
    rawSteps.push(
      'Align milestones with the timeline (project start/end) and current tasks: use list_tasks and list_milestones for projectId=' +
        params.projectId +
        ', then create_milestone with the same projectId when gaps exist.',
    );
  }
  if (params.pipeline.runAssign) {
    rawSteps.push(
      'Assign unassigned tasks for projectId=' +
        params.projectId +
        ': use get_user_skills for candidate member userIds from the snapshot, compare task text to skills, and use list_tasks to estimate workload per assignee. Pick the best skill match with reasonable load balance via update_task assigneeId.',
    );
    rawSteps.push(
      'If a task has NO suitable assignee (no credible skill overlap among project members, or everyone overloaded beyond reason), leave assigneeId unset and notify organizers: call send_message with channelId="' +
        params.channelId +
        '", senderId set to YOUR user id, type "system", and content that lists the unassigned task titles and asks organizers to assign owners manually.',
    );
  }
  const steps = rawSteps.map((s, i) => `${i + 1}) ${s}`);

  return `AUTOMATION RUN (client workspace)
projectId=${params.projectId}
channelId=${params.channelId}

Channel: ${params.channelNotes}

${params.projectSnapshot}

Recent client/organizer messages (may include requirements):
${params.messagesSnippet}

Linked wiki documents (names):
${params.wikiSnippet}

Execute in order:
${steps.join('\n')}

Summarize tasks, milestones, assignments, and any organizer notifications you posted.`;
}

function buildAutomationSystemPrompt(
  user: AuthenticatedUser,
  ragContext: string,
  orgOverview: string,
  opts?: { automationElevated?: boolean }
): string {
  const userName = user.name || user.firstName || user.email;
  const permSummary = describePermissions(user);
  const elevated =
    opts?.automationElevated === true
      ? `\nAUTOMATION MODE: This is a validated client_workspace message-triggered run. Task, milestone, assignment, channel messaging, and user-skills tools are enabled for this project even when your role token is a portal client (normal JWT permissions may look read-only).\n`
      : '';
  return `You are Vistone workspace automation for ${user.organizationName || 'the organization'}.

Current user (runner): ${userName} (${user.id}), role ${user.role}.
${permSummary}
${elevated}
ORGANIZATION SNAPSHOT (high-level; use tools for tasks, users, detailed project state):
${orgOverview || '(unavailable)'}

CLIENT WORKSPACE AUTOMATION RULES:
- You are acting on behalf of an organizer who enabled automation in organization settings.
- Only use data and tools permitted for this user. Stay within projectId and organization scope.
- The channel is the dedicated client↔organizer workspace; treat message text as potential client requirements.
- Hard constraint: every write MUST target the provided projectId only.
- Use the PROJECT SNAPSHOT first: it lists current tasks, milestones, timeline fields, members, and skills—keep new work consistent and non-duplicative.
- When wiki file names are listed, use them as context for what was already shared; use list_messages if you need more.
- Do not delete projects, clients, or wiki content unless explicitly required (prefer create/update only).
- Be conservative: if requirements are ambiguous, create fewer, clearer tasks rather than many vague ones.
- Assignment: only assign when skills and task wording clearly align; otherwise leave unassigned and notify organizers in-channel (send_message, type system) as instructed in the numbered steps.
- Organizers must be alerted via the client workspace channel when automation cannot pick an assignee.

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

  await presetAiDataScopeForClientWorkspaceChannel(user, body.projectId);

  const [messageTexts, wikiSnippet, projectSnapshot] = await Promise.all([
    fetchRecentMessages(body.channelId),
    channel.syncWikiId
      ? fetchWikiDocsSnippet(channel.syncWikiId)
      : Promise.resolve('(no sync wiki on channel)'),
    fetchProjectSnapshotText(body.projectId, organizationId),
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
    projectSnapshot,
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
  const systemPrompt = buildAutomationSystemPrompt(user, ragContext, orgOverview, {
    automationElevated: isAutoTriggered,
  });
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

  const result = await runAgent(user, queryText, systemPrompt, history, false, {
    clientWorkspaceAutomation: isAutoTriggered,
  });

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
