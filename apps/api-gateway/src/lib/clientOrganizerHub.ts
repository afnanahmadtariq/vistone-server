/**
 * When a project is tied to a client, provision:
 * - Project wiki (if missing) with client–organizer workspace metadata
 * - Wiki members: client contact user + all organizers (+ creator if not already included)
 * - A dedicated client_workspace chat channel (syncWikiId → wiki) for direct client↔organizer chat;
 *   file attachments in that channel sync into the wiki via communication → knowledge-hub.
 */
import {
  authClient,
  clientMgmtClient,
  communicationClient,
  knowledgeClient,
  ServiceRecord,
} from '../services/backendClient';

export async function provisionClientOrganizerWorkspaceHub(params: {
  organizationId: string;
  projectId: string;
  projectName?: string | null;
  clientId: string;
  creatorUserId: string;
}): Promise<void> {
  const { organizationId, projectId, projectName, clientId, creatorUserId } = params;

  const client = await clientMgmtClient.getById('/clients', clientId).catch(() => null);
  const clientUserId =
    client && typeof client.contactPersonId === 'string' && client.contactPersonId
      ? client.contactPersonId
      : null;
  if (!clientUserId) {
    console.warn(
      `[clientOrganizerHub] Skipping hub: client ${clientId} has no contactPersonId (portal user).`,
    );
    return;
  }

  const members = await authClient
    .get(`/organization-members?organizationId=${encodeURIComponent(organizationId)}`)
    .catch(() => [] as ServiceRecord[]);
  const memberList = Array.isArray(members) ? members : [];
  const organizerIds = memberList
    .filter((m) => (m.role as ServiceRecord)?.name === 'Organizer' && typeof m.userId === 'string')
    .map((m) => m.userId as string);

  const organizerSet = new Set<string>(organizerIds.length > 0 ? organizerIds : [creatorUserId]);
  organizerSet.add(creatorUserId);

  const wikiName = (projectName || 'Project').toString().trim() || 'Project';

  let links = await knowledgeClient
    .get(`/wiki-project-links?projectId=${encodeURIComponent(projectId)}`)
    .catch(() => [] as ServiceRecord[]);
  if (!Array.isArray(links) || links.length === 0) {
    const createdWiki = await knowledgeClient.post('/wikis', {
      name: `${wikiName} — Client workspace`,
      description: 'Shared wiki for client and organizers; chat files sync here.',
      organizationId,
      metadata: { clientOrganizerWorkspace: true, projectId },
    });
    if (createdWiki?.id) {
      await knowledgeClient.post('/wiki-project-links', {
        wikiId: createdWiki.id,
        projectId,
      });
    }
    links = await knowledgeClient
      .get(`/wiki-project-links?projectId=${encodeURIComponent(projectId)}`)
      .catch(() => [] as ServiceRecord[]);
  }

  const wikiId =
    Array.isArray(links) && links[0] && typeof links[0].wikiId === 'string' ? links[0].wikiId : null;
  if (!wikiId) {
    console.error('[clientOrganizerHub] No wiki linked to project', projectId);
    return;
  }

  await knowledgeClient.put('/wikis', wikiId, {
    metadata: { clientOrganizerWorkspace: true, projectId },
  });

  const memberUserIds = new Set<string>([clientUserId, ...organizerSet]);
  for (const userId of memberUserIds) {
    try {
      await knowledgeClient.post('/wiki-members', {
        wikiId,
        userId,
        role: organizerSet.has(userId) ? 'admin' : 'member',
      });
    } catch {
      /* duplicate membership */
    }
  }

  const existingChannels = await communicationClient
    .get(
      `/chat-channels?organizationId=${encodeURIComponent(organizationId)}&projectId=${encodeURIComponent(projectId)}&type=client_workspace`,
    )
    .catch(() => [] as ServiceRecord[]);
  if (Array.isArray(existingChannels) && existingChannels.length > 0) {
    return;
  }

  const channelName = `Client · ${wikiName}`;
  await communicationClient.post('/chat-channels', {
    organizationId,
    name: channelName,
    type: 'client_workspace',
    projectId,
    syncWikiId: wikiId,
    createdBy: creatorUserId,
    memberIds: Array.from(new Set([clientUserId, ...organizerSet])),
  });
}
