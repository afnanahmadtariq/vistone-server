/**
 * When a chat channel is linked to a wiki (syncWikiId), file attachments on messages
 * are copied into that wiki as documents (using the sender's JWT against knowledge-hub).
 */
import prisma from './prisma';

const KNOWLEDGE_URL = (process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:3005').replace(/\/$/, '');
const AI_ENGINE_URL = (process.env.AI_ENGINE_SERVICE_URL || 'http://localhost:3009').replace(/\/$/, '');
const AUTH_SERVICE_URL = (process.env.AUTH_SERVICE_URL || 'http://localhost:3001').replace(/\/$/, '');
const RUN_COOLDOWN_MS = 20_000;
const lastAutoAgentRunAt = new Map<string, number>();
const ORG_SETTING_CACHE_TTL_MS = 60_000;
const autoRunSettingCache = new Map<string, { enabled: boolean; expiresAt: number }>();

async function isAutoMessageTriggerEnabled(organizationId: string, authorization: string): Promise<boolean> {
  const now = Date.now();
  const cached = autoRunSettingCache.get(organizationId);
  if (cached && cached.expiresAt > now) return cached.enabled;

  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/organizations/${organizationId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`,
      },
    });
    if (!res.ok) {
      autoRunSettingCache.set(organizationId, { enabled: true, expiresAt: now + ORG_SETTING_CACHE_TTL_MS });
      return true; // fail-open to keep existing behavior
    }
    const org = (await res.json()) as { settings?: unknown };
    const settings =
      org?.settings && typeof org.settings === 'object' && !Array.isArray(org.settings)
        ? (org.settings as Record<string, unknown>)
        : {};
    const autoAgent =
      settings.autoAgent && typeof settings.autoAgent === 'object' && !Array.isArray(settings.autoAgent)
        ? (settings.autoAgent as Record<string, unknown>)
        : {};
    const enabled =
      autoAgent.autoRunOnClientWorkspaceMessage === undefined
        ? true
        : !!autoAgent.autoRunOnClientWorkspaceMessage;
    autoRunSettingCache.set(organizationId, { enabled, expiresAt: now + ORG_SETTING_CACHE_TTL_MS });
    return enabled;
  } catch {
    autoRunSettingCache.set(organizationId, { enabled: true, expiresAt: now + ORG_SETTING_CACHE_TTL_MS });
    return true;
  }
}

export async function syncChatAttachmentsToWiki(params: {
  channelId: string;
  messageId: string;
  senderId: string;
  attachments: Array<{ url?: string; fileType?: string; fileName?: string; fileSize?: number }>;
  authorization: string | undefined;
  organizationId: string | undefined;
}): Promise<void> {
  if (!params.attachments?.length || !params.authorization?.trim() || !params.organizationId?.trim()) {
    return;
  }

  const channel = await prisma.chatChannel.findUnique({ where: { id: params.channelId } });
  if (!channel?.syncWikiId) return;

  for (const att of params.attachments) {
    if (!att?.url) continue;
    const name = att.fileName?.trim() || `chat-file-${params.messageId}`;
    try {
      const res = await fetch(`${KNOWLEDGE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: params.authorization.startsWith('Bearer ')
            ? params.authorization
            : `Bearer ${params.authorization}`,
          'X-Organization-Id': params.organizationId.trim(),
        },
        body: JSON.stringify({
          wikiId: channel.syncWikiId,
          name,
          url: att.url,
          metadata: {
            source: 'chat',
            channelId: params.channelId,
            messageId: params.messageId,
            fileType: att.fileType,
            uploadedBy: params.senderId,
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[chat-wiki-sync] knowledge-hub rejected:', res.status, errText);
      }
    } catch (e) {
      console.error('[chat-wiki-sync] request failed', e);
    }
  }
}

export async function triggerClientWorkspaceAutoAgent(params: {
  channelId: string;
  messageId: string;
  content?: string;
  authorization: string | undefined;
  organizationId: string | undefined;
}): Promise<void> {
  if (!params.authorization?.trim() || !params.organizationId?.trim()) return;
  const hasText = typeof params.content === 'string' && params.content.trim().length > 0;
  if (!hasText) return;
  const orgId = params.organizationId.trim();
  const authHeader = params.authorization.startsWith('Bearer ')
    ? params.authorization
    : `Bearer ${params.authorization}`;
  const autoEnabled = await isAutoMessageTriggerEnabled(orgId, authHeader);
  if (!autoEnabled) return;

  const channel = await prisma.chatChannel.findUnique({ where: { id: params.channelId } });
  if (!channel || channel.type !== 'client_workspace' || !channel.projectId) return;

  const key = `${orgId}:${channel.projectId}:${params.channelId}`;
  const now = Date.now();
  const prev = lastAutoAgentRunAt.get(key) ?? 0;
  if (now - prev < RUN_COOLDOWN_MS) return;
  lastAutoAgentRunAt.set(key, now);

  try {
    const res = await fetch(`${AI_ENGINE_URL}/api/auto-agent/client-workspace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-Organization-Id': orgId,
      },
      body: JSON.stringify({
        organizationId: orgId,
        projectId: channel.projectId,
        channelId: params.channelId,
        triggerSource: 'auto',
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[client-workspace-auto-agent] rejected:', res.status, errText);
    }
  } catch (e) {
    console.error('[client-workspace-auto-agent] request failed', e);
  }
}
