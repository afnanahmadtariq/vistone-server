import { authServiceClient, safeCall } from './connectors';
import {
  DEFAULT_ORG_AUTO_AGENT,
  parseOrgAutoAgentSettings,
  type OrgAutoAgentSettings,
} from '../../lib/org-auto-agent-settings';

export async function fetchOrganizationSettings(organizationId: string): Promise<Record<string, unknown> | null> {
  const r = await safeCall(() => authServiceClient().get(`/organizations/${organizationId}`));
  if (!r.success || !r.data || typeof r.data !== 'object') return null;
  const row = r.data as { settings?: unknown };
  return row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
    ? (row.settings as Record<string, unknown>)
    : null;
}

export async function getOrgAutoAgentSettings(organizationId: string): Promise<OrgAutoAgentSettings> {
  const settings = await fetchOrganizationSettings(organizationId);
  const raw = settings?.autoAgent;
  if (!raw) return { ...DEFAULT_ORG_AUTO_AGENT };
  return parseOrgAutoAgentSettings(raw);
}
