import DataLoader from 'dataloader';
import { authClient, workforceClient } from '../services/backendClient';
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
    const skills = Array.isArray(userSkills)
      ? userSkills.map((s: ServiceRecord) => s.skillName)
      : [];

    return {
      ...user,
      teamId: teamMember?.teamId || null,
      joinedAt: teamMember?.createdAt || user.createdAt,
      skills,
      avatar: null,
      status: user.status || 'active',
    };
  } catch {
    return {
      ...user,
      teamId: null,
      joinedAt: user.createdAt,
      skills: [],
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

/**
 * Per-request loaders: dedupe + batch user enrichment for a single GraphQL operation.
 */
export function createGraphQLLoaders() {
  return {
    enrichedUser: new DataLoader<string, ServiceRecord | null>(batchLoadEnrichedUsers, {
      cache: true,
    }),
  };
}

export type GraphQLLoaders = ReturnType<typeof createGraphQLLoaders>;
