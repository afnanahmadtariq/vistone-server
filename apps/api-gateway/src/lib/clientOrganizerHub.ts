/**
 * When a project is tied to a client, provision:
 * - Project wiki (if missing) with client–organizer workspace metadata
 * - Wiki members: organizers only (admins). Clients access this wiki via project link + org scope on the API — no wiki-members row required for the portal user.
 * - A dedicated client_workspace chat channel (syncWikiId → wiki); organizers + the portal client user.
 *
 * `contactPersonId` on the CRM Client is the internal account contact — NOT the portal user's auth id.
 * Use `portalUserId` (set when the client accepts their invite) or resolve by email + org membership.
 */
import {
  authClient,
  clientMgmtClient,
  communicationClient,
  knowledgeClient,
  ServiceRecord,
} from '../services/backendClient';

async function listOrganizerUserIds(organizationId: string, creatorUserId: string): Promise<string[]> {
  const members = await authClient
    .get(`/organization-members?organizationId=${encodeURIComponent(organizationId)}`)
    .catch(() => [] as ServiceRecord[]);
  const memberList = Array.isArray(members) ? members : [];
  const fromRoles = memberList
    .filter((m) => (m.role as ServiceRecord)?.name === 'Organizer' && typeof m.userId === 'string')
    .map((m) => m.userId as string);
  const set = new Set(fromRoles);
  if (typeof creatorUserId === 'string' && creatorUserId.trim()) {
    set.add(creatorUserId.trim());
  }
  return Array.from(set);
}

/** Portal client's auth user id — never use contactPersonId for chat/wiki participant resolution. */
export async function resolvePortalUserIdForClient(
  client: ServiceRecord,
  organizationId: string,
): Promise<string | null> {
  if (typeof client.portalUserId === 'string' && client.portalUserId.trim()) {
    return client.portalUserId.trim();
  }
  const email = typeof client.email === 'string' ? client.email.trim().toLowerCase() : '';
  if (!email) return null;
  try {
    const users = await authClient.get(`/users?email=${encodeURIComponent(email)}`);
    const u = Array.isArray(users) ? users[0] : null;
    if (!u?.id) return null;
    const members = await authClient.get(
      `/organization-members?organizationId=${encodeURIComponent(organizationId)}`,
    );
    const list = Array.isArray(members) ? members : [];
    const ok = list.some((m: ServiceRecord) => m.userId === u.id);
    return ok ? (u.id as string) : null;
  } catch {
    return null;
  }
}

async function ensureWikiOrganizerMembers(wikiId: string, organizerUserIds: string[]): Promise<void> {
  for (const userId of organizerUserIds) {
    try {
      await knowledgeClient.post('/wiki-members', {
        wikiId,
        userId,
        role: 'admin',
      });
    } catch {
      /* duplicate membership */
    }
  }
}

async function ensureChannelMembersForUsers(channelId: string, userIds: string[]): Promise<void> {
  const unique = Array.from(new Set(userIds.filter((id) => typeof id === 'string' && id.trim())));
  for (const userId of unique) {
    try {
      await communicationClient.post('/channel-members', {
        channelId,
        userId,
      });
    } catch {
      /* duplicate [channelId, userId] */
    }
  }
}

/**
 * Ensure organizers + portal client are members of the client_workspace channel and organizers are wiki admins.
 * Safe to call multiple times (duplicates ignored).
 */
export async function syncClientOrganizerHubParticipants(params: {
  organizationId: string;
  clientId: string;
  projectId: string;
  creatorUserId?: string;
}): Promise<void> {
  const { organizationId, clientId, projectId } = params;
  const creatorFallback =
    typeof params.creatorUserId === 'string' && params.creatorUserId.trim()
      ? params.creatorUserId.trim()
      : '';

  const client = await clientMgmtClient.getById('/clients', clientId).catch(() => null);
  if (!client) return;

  const portalUserId = await resolvePortalUserIdForClient(client, organizationId);
  const effectiveOrganizers = await listOrganizerUserIds(organizationId, creatorFallback);

  const links = await knowledgeClient
    .get(`/wiki-project-links?projectId=${encodeURIComponent(projectId)}`)
    .catch(() => [] as ServiceRecord[]);
  const wikiId =
    Array.isArray(links) && links[0] && typeof links[0].wikiId === 'string' ? links[0].wikiId : null;

  if (wikiId && effectiveOrganizers.length > 0) {
    await ensureWikiOrganizerMembers(wikiId, effectiveOrganizers);
  }

  const channels = await communicationClient
    .get(
      `/chat-channels?organizationId=${encodeURIComponent(organizationId)}&projectId=${encodeURIComponent(projectId)}&type=client_workspace`,
    )
    .catch(() => [] as ServiceRecord[]);

  const channel =
    Array.isArray(channels) && channels.length > 0 ? (channels[0] as ServiceRecord) : null;
  const channelId = typeof channel?.id === 'string' ? channel.id : null;
  if (!channelId) return;

  const chatParticipants = [...effectiveOrganizers];
  if (portalUserId) chatParticipants.push(portalUserId);

  await ensureChannelMembersForUsers(channelId, chatParticipants);
}

export async function provisionClientOrganizerWorkspaceHub(params: {
  organizationId: string;
  projectId: string;
  projectName?: string | null;
  clientId: string;
  creatorUserId: string;
}): Promise<void> {
  const { organizationId, projectId, projectName, clientId, creatorUserId } = params;

  const client = await clientMgmtClient.getById('/clients', clientId).catch(() => null);
  if (!client) {
    console.warn(`[clientOrganizerHub] Client ${clientId} not found`);
    return;
  }

  const portalUserId = await resolvePortalUserIdForClient(client, organizationId);
  const organizerIds = await listOrganizerUserIds(organizationId, creatorUserId);

  const wikiName = (projectName || 'Project').toString().trim() || 'Project';

  let links = await knowledgeClient
    .get(`/wiki-project-links?projectId=${encodeURIComponent(projectId)}`)
    .catch(() => [] as ServiceRecord[]);
  if (!Array.isArray(links) || links.length === 0) {
    const createdWiki = await knowledgeClient.post('/wikis', {
      name: `${wikiName} — Client workspace`,
      description: 'Shared documentation for this project; chat file attachments sync here.',
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

  await ensureWikiOrganizerMembers(wikiId, organizerIds);

  const existingChannels = await communicationClient
    .get(
      `/chat-channels?organizationId=${encodeURIComponent(organizationId)}&projectId=${encodeURIComponent(projectId)}&type=client_workspace`,
    )
    .catch(() => [] as ServiceRecord[]);

  const channelMemberIds = new Set<string>(organizerIds);
  if (portalUserId) channelMemberIds.add(portalUserId);

  if (Array.isArray(existingChannels) && existingChannels.length > 0) {
    const ch = existingChannels[0] as ServiceRecord;
    if (typeof ch?.id === 'string') {
      await ensureChannelMembersForUsers(ch.id, Array.from(channelMemberIds));
    }
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
    memberIds: Array.from(channelMemberIds),
  });
}
