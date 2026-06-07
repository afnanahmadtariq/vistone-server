/**
 * High-level organization snapshot for LLM system prompts.
 * Fetches members, projects, teams, and CRM clients using the same JWT + org
 * as the chat request so RBAC matches the signed-in user.
 */
import { config } from '../config';
import type { AuthenticatedUser } from '../types';
import {
  authServiceClient,
  projectClient,
  workforceClient,
  clientClient,
} from './connectors';

type UnknownRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function userDisplayName(u: UnknownRecord): string {
  const fn = pickString(u.firstName);
  const ln = pickString(u.lastName);
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ');
  return pickString(u.email) ?? pickString(u.id) ?? 'User';
}

/**
 * Compact text block for the system prompt. Safe if services fail (partial or empty).
 */
export async function buildOrganizationOverviewForPrompt(user: AuthenticatedUser): Promise<string> {
  const orgId = user.organizationId?.trim();
  if (!orgId) {
    return '';
  }

  const { maxMembers, maxProjects, maxTeams, maxClients, maxChars } = config.orgOverview;

  const auth = authServiceClient();
  const proj = projectClient();
  const wf = workforceClient();
  const cli = clientClient();

  const [usersRes, membersRes, projectsRes, teamsRes, clientsRes] = await Promise.all([
    auth.get('/users', { params: { organizationId: orgId } }).catch(() => ({ data: [] })),
    auth.get('/organization-members', { params: { organizationId: orgId } }).catch(() => ({ data: [] })),
    proj.get('/projects', { params: { organizationId: orgId } }).catch(() => ({ data: [] })),
    wf.get('/teams', { params: { organizationId: orgId } }).catch(() => ({ data: [] })),
    cli.get('/clients', { params: { organizationId: orgId } }).catch(() => ({ data: [] })),
  ]);

  const users = Array.isArray(usersRes.data) ? (usersRes.data as UnknownRecord[]) : [];
  const members = Array.isArray(membersRes.data) ? (membersRes.data as UnknownRecord[]) : [];
  const projects = Array.isArray(projectsRes.data) ? (projectsRes.data as UnknownRecord[]) : [];
  const teams = Array.isArray(teamsRes.data) ? (teamsRes.data as UnknownRecord[]) : [];
  const clients = Array.isArray(clientsRes.data) ? (clientsRes.data as UnknownRecord[]) : [];

  const roleByUser = new Map<string, string>();
  for (const m of members) {
    const uid = pickString(m.userId);
    const role = m.role as UnknownRecord | undefined;
    const rname = role && pickString(role.name);
    if (uid && rname) roleByUser.set(uid, rname);
  }

  const lines: string[] = [];
  lines.push(`Organization: ${user.organizationName || '(name unknown)'} (id=${orgId})`);
  lines.push('');
  lines.push('MEMBERS (summary — use tools for full profiles, permissions, or lists filtered by role):');
  let mc = 0;
  for (const u of users) {
    if (mc >= maxMembers) break;
    const id = pickString(u.id);
    if (!id) continue;
    const name = userDisplayName(u);
    const email = pickString(u.email);
    const role = roleByUser.get(id) ?? '?';
    lines.push(`- ${name}${email ? ` <${email}>` : ''} — role: ${role} — userId=${id}`);
    mc++;
  }
  if (users.length > maxMembers) {
    lines.push(`… and ${users.length - maxMembers} more members not listed.`);
  }
  if (users.length === 0) {
    lines.push('(none returned — your account may not have user-directory access, or the org has no users yet.)');
  }

  lines.push('');
  lines.push('PROJECTS (summary — use list_tasks / get_project / etc. for detail):');
  let pc = 0;
  for (const p of projects) {
    if (pc >= maxProjects) break;
    const id = pickString(p.id);
    const name = pickString(p.name) ?? '(unnamed)';
    const status = pickString(p.status) ?? '?';
    const managerId = pickString(p.managerId);
    const clientId = pickString(p.clientId);
    lines.push(
      `- ${name} — status: ${status} — id=${id}${managerId ? ` — managerId=${managerId}` : ''}${clientId ? ` — clientId=${clientId}` : ''}`,
    );
    pc++;
  }
  if (projects.length > maxProjects) {
    lines.push(`… and ${projects.length - maxProjects} more projects not listed.`);
  }
  if (projects.length === 0) {
    lines.push('(none returned.)');
  }

  lines.push('');
  lines.push('TEAMS:');
  let tc = 0;
  for (const t of teams) {
    if (tc >= maxTeams) break;
    const id = pickString(t.id);
    const name = pickString(t.name) ?? '(unnamed)';
    const mid = pickString(t.managerId);
    lines.push(`- ${name} — id=${id}${mid ? ` — managerId=${mid}` : ''}`);
    tc++;
  }
  if (teams.length > maxTeams) {
    lines.push(`… and ${teams.length - maxTeams} more teams not listed.`);
  }
  if (teams.length === 0) {
    lines.push('(none returned.)');
  }

  lines.push('');
  lines.push('CLIENTS (CRM, summary):');
  let cc = 0;
  for (const c of clients) {
    if (cc >= maxClients) break;
    const id = pickString(c.id);
    const name = pickString(c.name) ?? pickString(c.company) ?? '(unnamed)';
    const status = pickString(c.status) ?? '?';
    lines.push(`- ${name} — status: ${status} — id=${id}`);
    cc++;
  }
  if (clients.length > maxClients) {
    lines.push(`… and ${clients.length - maxClients} more clients not listed.`);
  }
  if (clients.length === 0) {
    lines.push('(none returned or no CRM access.)');
  }

  lines.push('');
  lines.push(
    'IMPORTANT: This snapshot is high-level and may omit or abbreviate data based on your permissions. For tasks, milestones, chat messages, wiki pages, documents, or exact counts, call the appropriate read/list tools. Prefer real tool results over guessing from this list.',
  );

  let text = lines.join('\n');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars) + '\n…[organization overview truncated to maxChars]';
  }
  return text;
}
