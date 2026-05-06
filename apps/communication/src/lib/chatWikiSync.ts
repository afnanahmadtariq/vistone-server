/**
 * When a chat channel is linked to a wiki (syncWikiId), file attachments on messages
 * are copied into that wiki as documents (using the sender's JWT against knowledge-hub).
 */
import prisma from './prisma';

const KNOWLEDGE_URL = (process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:3005').replace(/\/$/, '');

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
