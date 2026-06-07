import { ROLE_NAMES } from './roles';

export type OrganizationMemberKindValue =
  | 'ORGANIZER'
  | 'MANAGER'
  | 'CONTRIBUTOR'
  | 'CLIENT';

const ORG = ROLE_NAMES.ORGANIZER.toLowerCase();
const MGR = ROLE_NAMES.MANAGER.toLowerCase();
const CTR = ROLE_NAMES.CONTRIBUTOR.toLowerCase();
const CLI = ROLE_NAMES.CLIENT.toLowerCase();

/**
 * Maps auth Role.name (or invite fallback strings) to organization_members.member_kind.
 */
export function memberKindFromRoleName(roleName: string | null | undefined): OrganizationMemberKindValue {
  const key = (roleName || '').trim().toLowerCase();
  if (key === ORG) return 'ORGANIZER';
  if (key === MGR) return 'MANAGER';
  if (key === CTR) return 'CONTRIBUTOR';
  if (key === CLI) return 'CLIENT';
  // Legacy / generic invite labels
  if (key === 'member' || key === 'admin' || key === '') return 'CONTRIBUTOR';
  return 'CONTRIBUTOR';
}
