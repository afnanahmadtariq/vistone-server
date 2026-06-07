/**
 * Row-level data scope for the AI agent and RAG.
 * Mirrors api-gateway `myProjects` / wiki access rules so tools cannot list org-wide data
 * when the UI would not.
 */
import type { AuthenticatedUser, AiDataScope, SimilarDocument } from '../types';
import {
    projectClient,
    clientClient,
    workforceClient,
    knowledgeClient,
    safeCall,
} from './connectors';
import { getServiceRequestContext } from './request-context';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceRecord = Record<string, any>;

export function isOrganizerRole(user: AuthenticatedUser): boolean {
    return user.role?.toLowerCase() === 'organizer';
}

export function denyToolResult(message: string): string {
    return JSON.stringify({ success: false, error: message });
}

export function projectIdAllowed(scope: AiDataScope, projectId: string): boolean {
    if (scope.projectScope.allInOrganization) return true;
    return scope.projectScope.ids.has(projectId);
}

export function clientIdAllowed(scope: AiDataScope, clientId: string): boolean {
    if (scope.clientIds === null) return true;
    return scope.clientIds.has(clientId);
}

export function wikiIdAllowed(scope: AiDataScope, wikiId: string): boolean {
    if (scope.wikiIds === null) return true;
    return scope.wikiIds.has(wikiId);
}

/**
 * Same composite rules as gateway `myProjects` (membership, manager, teams, client contact / links).
 */
async function collectMyProjectIds(user: AuthenticatedUser): Promise<Set<string>> {
    const projectIds = new Set<string>();

    const [projectMembers, managedProjects] = await Promise.all([
        safeCall(() => projectClient().get(`/project-members?userId=${user.id}`)),
        safeCall(() => projectClient().get(`/projects?managerId=${user.id}`)),
    ]);

    if (projectMembers.success && Array.isArray(projectMembers.data)) {
        projectMembers.data.forEach((pm: ServiceRecord) => {
            if (typeof pm?.projectId === 'string' && pm.projectId) projectIds.add(pm.projectId);
        });
    }
    if (managedProjects.success && Array.isArray(managedProjects.data)) {
        managedProjects.data.forEach((p: ServiceRecord) => {
            if (typeof p?.id === 'string' && p.id) projectIds.add(p.id);
        });
    }

    const orgId = user.organizationId.trim();
    const [teamMemberships, orgTeams, allOrgProjects] = await Promise.all([
        safeCall(() => workforceClient().get(`/team-members?userId=${user.id}`)),
        safeCall(() => workforceClient().get(`/teams?organizationId=${orgId}`)),
        safeCall(() => projectClient().get(`/projects?organizationId=${orgId}`)),
    ]);

    const userTeamIds = new Set<string>();
    if (teamMemberships.success && Array.isArray(teamMemberships.data)) {
        teamMemberships.data.forEach((tm: ServiceRecord) => {
            if (typeof tm?.teamId === 'string' && tm.teamId) userTeamIds.add(tm.teamId);
        });
    }
    if (orgTeams.success && Array.isArray(orgTeams.data)) {
        orgTeams.data.forEach((team: ServiceRecord) => {
            if (team?.managerId === user.id && typeof team?.id === 'string' && team.id) {
                userTeamIds.add(team.id);
            }
        });
    }
    if (userTeamIds.size > 0 && allOrgProjects.success && Array.isArray(allOrgProjects.data)) {
        allOrgProjects.data.forEach((p: ServiceRecord) => {
            const projectTeamIds: string[] = Array.isArray(p.teamIds) ? p.teamIds : [];
            if (projectTeamIds.some((tid) => userTeamIds.has(tid)) && typeof p?.id === 'string' && p.id) {
                projectIds.add(p.id);
            }
        });
    }

    const clientsRes = await safeCall(() => clientClient().get(`/clients?contactPersonId=${user.id}`));
    if (clientsRes.success && Array.isArray(clientsRes.data)) {
        for (const client of clientsRes.data) {
            const cid = typeof client?.id === 'string' ? client.id : '';
            if (!cid) continue;

            const pcs = await safeCall(() => clientClient().get(`/project-clients?clientId=${cid}`));
            if (pcs.success && Array.isArray(pcs.data)) {
                pcs.data.forEach((pc: ServiceRecord) => {
                    if (typeof pc?.projectId === 'string' && pc.projectId) projectIds.add(pc.projectId);
                });
            }

            const cap = await safeCall(() => projectClient().get(`/projects?clientId=${cid}`));
            if (cap.success && Array.isArray(cap.data)) {
                cap.data.forEach((p: ServiceRecord) => {
                    if (typeof p?.id === 'string' && p.id) projectIds.add(p.id);
                });
            }
        }
    }

    /** Portal client accounts: CRM Client.portalUserId links auth user → projects via project-clients. */
    const portalClientsRes = await safeCall(() =>
        clientClient().get(
            `/clients?organizationId=${encodeURIComponent(orgId)}&portalUserId=${encodeURIComponent(user.id)}`
        )
    );
    if (portalClientsRes.success && Array.isArray(portalClientsRes.data)) {
        for (const client of portalClientsRes.data) {
            const cid = typeof client?.id === 'string' ? client.id : '';
            if (!cid) continue;
            const pcs = await safeCall(() => clientClient().get(`/project-clients?clientId=${cid}`));
            if (pcs.success && Array.isArray(pcs.data)) {
                pcs.data.forEach((pc: ServiceRecord) => {
                    if (typeof pc?.projectId === 'string' && pc.projectId) projectIds.add(pc.projectId);
                });
            }
            const cap = await safeCall(() => projectClient().get(`/projects?clientId=${cid}`));
            if (cap.success && Array.isArray(cap.data)) {
                cap.data.forEach((p: ServiceRecord) => {
                    if (typeof p?.id === 'string' && p.id) projectIds.add(p.id);
                });
            }
        }
    }

    return projectIds;
}

async function collectAccessibleWikiIds(
    user: AuthenticatedUser,
    projectIds: Set<string>
): Promise<Set<string>> {
    const wikiIds = new Set<string>();

    await Promise.all(
        Array.from(projectIds).map(async (projectId) => {
            const links = await safeCall(() =>
                knowledgeClient().get(`/wiki-project-links?projectId=${encodeURIComponent(projectId)}`)
            );
            if (links.success && Array.isArray(links.data)) {
                links.data.forEach((link: ServiceRecord) => {
                    if (typeof link?.wikiId === 'string' && link.wikiId) wikiIds.add(link.wikiId);
                });
            }
        })
    );

    const explicit = await safeCall(() =>
        knowledgeClient().get(`/wiki-members?userId=${encodeURIComponent(user.id)}`)
    );
    if (explicit.success && Array.isArray(explicit.data)) {
        explicit.data.forEach((row: ServiceRecord) => {
            if (typeof row?.wikiId === 'string' && row.wikiId) wikiIds.add(row.wikiId);
        });
    }

    return wikiIds;
}

async function collectAccessibleClientIds(
    user: AuthenticatedUser,
    projectIds: Set<string>
): Promise<Set<string>> {
    const clientIds = new Set<string>();
    const orgId = user.organizationId.trim();

    const projectsRes = await safeCall(() => projectClient().get(`/projects?organizationId=${orgId}`));
    if (projectsRes.success && Array.isArray(projectsRes.data)) {
        projectsRes.data.forEach((p: ServiceRecord) => {
            if (
                typeof p?.id === 'string' &&
                projectIds.has(p.id) &&
                typeof p?.clientId === 'string' &&
                p.clientId
            ) {
                clientIds.add(p.clientId);
            }
        });
    }

    await Promise.all(
        Array.from(projectIds).map(async (pid) => {
            const pcs = await safeCall(() => clientClient().get(`/project-clients?projectId=${pid}`));
            if (pcs.success && Array.isArray(pcs.data)) {
                pcs.data.forEach((pc: ServiceRecord) => {
                    if (typeof pc?.clientId === 'string' && pc.clientId) clientIds.add(pc.clientId);
                });
            }
        })
    );

    const clientsRes = await safeCall(() => clientClient().get(`/clients?contactPersonId=${user.id}`));
    if (clientsRes.success && Array.isArray(clientsRes.data)) {
        clientsRes.data.forEach((c: ServiceRecord) => {
            if (typeof c?.id === 'string' && c.id) clientIds.add(c.id);
        });
    }

    return clientIds;
}

export async function buildAiDataScope(user: AuthenticatedUser): Promise<AiDataScope> {
    if (isOrganizerRole(user)) {
        return {
            projectScope: { allInOrganization: true },
            clientIds: null,
            wikiIds: null,
        };
    }

    const ids = await collectMyProjectIds(user);
    const [wikiIds, clientIds] = await Promise.all([
        collectAccessibleWikiIds(user, ids),
        collectAccessibleClientIds(user, ids),
    ]);

    return {
        projectScope: { allInOrganization: false, ids },
        clientIds,
        wikiIds,
    };
}

export async function ensureAiDataScope(user: AuthenticatedUser): Promise<AiDataScope> {
    const ctx = getServiceRequestContext();
    if (ctx?.aiDataScope) return ctx.aiDataScope;

    const scope = await buildAiDataScope(user);
    if (ctx) {
        ctx.aiDataScope = scope;
    }
    return scope;
}

/**
 * After the client_workspace channel is validated against `projectId`, union that project into
 * the AI data scope so RAG and tools match the hub project (portal clients may not appear in
 * generic membership queries alone).
 */
export async function presetAiDataScopeForClientWorkspaceChannel(
    user: AuthenticatedUser,
    projectId: string
): Promise<void> {
    const ctx = getServiceRequestContext();
    if (!ctx) return;
    const base = await buildAiDataScope(user);
    const pid = projectId.trim();
    if (!pid) return;
    if (base.projectScope.allInOrganization) {
        ctx.aiDataScope = base;
        return;
    }
    const ids = new Set(base.projectScope.ids);
    ids.add(pid);
    ctx.aiDataScope = {
        ...base,
        projectScope: { allInOrganization: false, ids },
    };
}

export function filterRagDocumentsByDataScope(
    docs: SimilarDocument[],
    scope: AiDataScope,
    user: AuthenticatedUser
): SimilarDocument[] {
    if (
        scope.projectScope.allInOrganization &&
        scope.clientIds === null &&
        scope.wikiIds === null
    ) {
        return docs;
    }

    const projectIds = scope.projectScope.allInOrganization ? null : scope.projectScope.ids;
    const { clientIds } = scope;
    const { wikiIds } = scope;
    const isClientUser = user.role?.toLowerCase() === 'client';

    return docs.filter((doc) => {
        switch (doc.contentType) {
            case 'project':
                if (projectIds === null) return true;
                return projectIds.has(doc.sourceId);
            case 'task':
            case 'milestone':
            case 'risk': {
                const pid = doc.metadata?.projectId;
                if (typeof pid !== 'string') return false;
                if (projectIds === null) return true;
                return projectIds.has(pid);
            }
            case 'client':
                if (clientIds === null) return true;
                return clientIds.has(doc.sourceId);
            case 'proposal': {
                const cid = doc.metadata?.clientId;
                if (typeof cid !== 'string') return false;
                if (clientIds === null) return true;
                return clientIds.has(cid);
            }
            case 'wiki':
            case 'document': {
                const wid = doc.metadata?.wikiId;
                if (typeof wid !== 'string') return false;
                if (wikiIds === null) return true;
                return wikiIds.has(wid);
            }
            case 'organization':
                return true;
            case 'team':
            case 'member':
                return !isClientUser;
            default:
                return true;
        }
    });
}
