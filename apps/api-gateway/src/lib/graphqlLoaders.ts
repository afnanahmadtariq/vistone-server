import DataLoader from 'dataloader';
import {
  authClient,
  workforceClient,
  projectClient,
  clientMgmtClient,
} from '../services/backendClient';
import type { ServiceRecord } from '../services/backendClient';

/**
 * Attach workforce profile fields used by the gateway schema (teams + skills).
 * Runs the two workforce reads in parallel per user.
 */
export async function enrichUserWithWorkforceData(
  user: ServiceRecord | null
): Promise<ServiceRecord | null> {
  if (!user) return null;

  try {
    const [teamMembers, userSkills] = await Promise.all([
      workforceClient.get(`/team-members?userId=${user.id}`),
      workforceClient.get(`/user-skills?userId=${user.id}`),
    ]);
    const teamMember = Array.isArray(teamMembers) ? teamMembers[0] : null;
    const fromProfile = user.professionalProfile as { skillTags?: string[] } | undefined;
    const profileTags =
      Array.isArray(fromProfile?.skillTags) && fromProfile.skillTags.length > 0
        ? fromProfile.skillTags.filter((t): t is string => typeof t === 'string' && t.length > 0)
        : null;
    const skills = profileTags
      ? profileTags
      : Array.isArray(userSkills)
        ? userSkills.map((s: ServiceRecord) => s.skillName)
        : [];

    return {
      ...user,
      teamId: teamMember?.teamId || null,
      joinedAt: teamMember?.createdAt || user.createdAt,
      skills,
      professionalProfile: user.professionalProfile ?? null,
      avatar: null,
      status: user.status || 'active',
    };
  } catch {
    return {
      ...user,
      teamId: null,
      joinedAt: user.createdAt,
      skills: [],
      professionalProfile: user.professionalProfile ?? null,
      avatar: null,
      status: user.status || 'active',
    };
  }
}

async function batchLoadEnrichedUsers(
  userIds: readonly string[]
): Promise<(ServiceRecord | null)[]> {
  const uniqueIds = [...new Set(userIds)];
  const byId = new Map<string, ServiceRecord | null>();

  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const user = await authClient.getById('/users', id);
        byId.set(id, await enrichUserWithWorkforceData(user));
      } catch {
        byId.set(id, null);
      }
    })
  );

  return userIds.map((id) => byId.get(id) ?? null);
}

async function batchOrgMembersByUserId(
  userIds: readonly string[]
): Promise<ServiceRecord[][]> {
  const uniqueIds = [...new Set(userIds)];
  const byUser = new Map<string, ServiceRecord[]>();
  await Promise.all(
    uniqueIds.map(async (uid) => {
      try {
        const m = await authClient.get(`/organization-members?userId=${uid}`);
        byUser.set(uid, Array.isArray(m) ? m : []);
      } catch {
        byUser.set(uid, []);
      }
    })
  );
  return userIds.map((id) => byUser.get(id) ?? []);
}

async function batchRoleById(
  roleIds: readonly string[]
): Promise<(ServiceRecord | null)[]> {
  const uniqueIds = [...new Set(roleIds)].filter(Boolean);
  const byId = new Map<string, ServiceRecord | null>();
  await Promise.all(
    uniqueIds.map(async (rid) => {
      try {
        byId.set(rid, await authClient.getById('/roles', rid));
      } catch {
        byId.set(rid, null);
      }
    })
  );
  return roleIds.map((id) => (id ? byId.get(id) ?? null : null));
}

async function batchTeamMembersByUserId(
  userIds: readonly string[]
): Promise<ServiceRecord[][]> {
  const uniqueIds = [...new Set(userIds)];
  const byUser = new Map<string, ServiceRecord[]>();
  await Promise.all(
    uniqueIds.map(async (uid) => {
      try {
        const tm = await workforceClient.get(`/team-members?userId=${uid}`);
        byUser.set(uid, Array.isArray(tm) ? tm : []);
      } catch {
        byUser.set(uid, []);
      }
    })
  );
  return userIds.map((id) => byUser.get(id) ?? []);
}

async function batchTeamById(ids: readonly string[]): Promise<(ServiceRecord | null)[]> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const byId = new Map<string, ServiceRecord | null>();
  await Promise.all(
    uniqueIds.map(async (tid) => {
      try {
        byId.set(tid, await workforceClient.getById('/teams', tid));
      } catch {
        byId.set(tid, null);
      }
    })
  );
  return ids.map((id) => (id ? byId.get(id) ?? null : null));
}

async function batchProjectById(ids: readonly string[]): Promise<(ServiceRecord | null)[]> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const byId = new Map<string, ServiceRecord | null>();
  await Promise.all(
    uniqueIds.map(async (pid) => {
      try {
        byId.set(pid, await projectClient.getById('/projects', pid));
      } catch {
        byId.set(pid, null);
      }
    })
  );
  return ids.map((id) => (id ? byId.get(id) ?? null : null));
}

async function batchClientById(ids: readonly string[]): Promise<(ServiceRecord | null)[]> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const byId = new Map<string, ServiceRecord | null>();
  await Promise.all(
    uniqueIds.map(async (cid) => {
      try {
        byId.set(cid, await clientMgmtClient.getById('/clients', cid));
      } catch {
        byId.set(cid, null);
      }
    })
  );
  return ids.map((id) => (id ? byId.get(id) ?? null : null));
}

async function batchProjectMembersByProjectId(
  projectIds: readonly string[]
): Promise<ServiceRecord[][]> {
  const uniqueIds = [...new Set(projectIds)];
  const byProject = new Map<string, ServiceRecord[]>();
  await Promise.all(
    uniqueIds.map(async (pid) => {
      try {
        const pm = await projectClient.get(`/project-members?projectId=${pid}`);
        byProject.set(pid, Array.isArray(pm) ? pm : []);
      } catch {
        byProject.set(pid, []);
      }
    })
  );
  return projectIds.map((id) => byProject.get(id) ?? []);
}

/**
 * Per-request loaders: dedupe + batch repeated microservice reads within one GraphQL operation.
 */
export function createGraphQLLoaders() {
  return {
    enrichedUser: new DataLoader<string, ServiceRecord | null>(batchLoadEnrichedUsers, {
      cache: true,
    }),
    organizationMembersByUserId: new DataLoader<string, ServiceRecord[]>(
      batchOrgMembersByUserId,
      { cache: true }
    ),
    authRoleById: new DataLoader<string, ServiceRecord | null>(batchRoleById, { cache: true }),
    teamMembersByUserId: new DataLoader<string, ServiceRecord[]>(batchTeamMembersByUserId, {
      cache: true,
    }),
    teamById: new DataLoader<string, ServiceRecord | null>(batchTeamById, { cache: true }),
    projectById: new DataLoader<string, ServiceRecord | null>(batchProjectById, { cache: true }),
    clientById: new DataLoader<string, ServiceRecord | null>(batchClientById, { cache: true }),
    projectMembersByProjectId: new DataLoader<string, ServiceRecord[]>(
      batchProjectMembersByProjectId,
      { cache: true }
    ),
  };
}

export type GraphQLLoaders = ReturnType<typeof createGraphQLLoaders>;
