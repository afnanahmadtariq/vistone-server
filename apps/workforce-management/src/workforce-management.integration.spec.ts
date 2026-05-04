/**
 * Workforce Management Service – Integration Tests
 */
jest.mock('axios');

jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    team: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    teamMember: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), findFirst: jest.fn() },
    userSkill: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    userAvailability: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import request from 'supertest';
import axios from 'axios';
import app from './app';
import prisma from './lib/prisma';

const mockedAxios = axios as jest.Mocked<typeof axios>;

const team = { id: 'team-1', organizationId: 'org-1', name: 'Engineering', createdAt: new Date().toISOString(), members: [] };
const teamMember = { id: 'tm-1', teamId: 'team-1', userId: 'user-1', role: 'member', joinedAt: new Date().toISOString() };
const skill = { id: 'sk-1', userId: 'user-1', skill: 'TypeScript', level: 'ADVANCED', createdAt: new Date().toISOString() };
const availability = { id: 'av-1', userId: 'user-1', hoursPerDay: 8, createdAt: new Date().toISOString() };

beforeEach(() => {
  jest.clearAllMocks();
  // Mock axios.get to return empty data by default (teams controller calls external services)
  mockedAxios.get.mockResolvedValue({ data: [] });
});

// ── Teams ──────────────────────────────────────────────────────
describe('GET /teams', () => {
  it('returns 200 with teams array', async () => {
    (prisma.team.findMany as jest.Mock).mockResolvedValue([team]);
    const res = await request(app).get('/teams');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /teams', () => {
  it('creates a team', async () => {
    (prisma.team.create as jest.Mock).mockResolvedValue(team);
    const res = await request(app).post('/teams').send({ organizationId: 'org-1', name: 'Engineering' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /teams/:id', () => {
  it('returns 200 when team exists', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue({ ...team, members: [] });
    const res = await request(app).get('/teams/team-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when team not found', async () => {
    (prisma.team.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/teams/missing');
    expect(res.status).toBe(404);
  });
});

describe('PUT /teams/:id', () => {
  it('updates a team', async () => {
    (prisma.team.update as jest.Mock).mockResolvedValue({ ...team, name: 'Platform' });
    const res = await request(app).put('/teams/team-1').send({ name: 'Platform' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /teams/:id', () => {
  it('deletes a team', async () => {
    (prisma.teamMember.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    (prisma.team.delete as jest.Mock).mockResolvedValue(team);
    const res = await request(app).delete('/teams/team-1');
    expect(res.status).toBe(200);
  });
});

// ── Team Members ──────────────────────────────────────────────
describe('GET /team-members', () => {
  it('returns 200', async () => {
    (prisma.teamMember.findMany as jest.Mock).mockResolvedValue([teamMember]);
    const res = await request(app).get('/team-members');
    expect(res.status).toBe(200);
  });
});

describe('POST /team-members', () => {
  it('creates a team member', async () => {
    (prisma.teamMember.create as jest.Mock).mockResolvedValue(teamMember);
    const res = await request(app).post('/team-members').send({ teamId: 'team-1', userId: 'user-1' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /team-members/:id', () => {
  it('returns 200 when member exists', async () => {
    (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(teamMember);
    const res = await request(app).get('/team-members/tm-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when member not found', async () => {
    (prisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/team-members/missing');
    expect(res.status).toBe(404);
  });
});

// ── User Skills ───────────────────────────────────────────────
describe('GET /user-skills', () => {
  it('returns 200', async () => {
    (prisma.userSkill.findMany as jest.Mock).mockResolvedValue([skill]);
    const res = await request(app).get('/user-skills');
    expect(res.status).toBe(200);
  });
});

describe('POST /user-skills', () => {
  it('creates a skill', async () => {
    (prisma.userSkill.create as jest.Mock).mockResolvedValue(skill);
    const res = await request(app).post('/user-skills').send({ userId: 'user-1', skill: 'TypeScript', level: 'ADVANCED' });
    expect([200, 201]).toContain(res.status);
  });
});

// ── User Availability ─────────────────────────────────────────
describe('GET /user-availability', () => {
  it('returns 200', async () => {
    (prisma.userAvailability.findMany as jest.Mock).mockResolvedValue([availability]);
    const res = await request(app).get('/user-availability');
    expect(res.status).toBe(200);
  });
});

describe('POST /user-availability', () => {
  it('creates availability', async () => {
    (prisma.userAvailability.create as jest.Mock).mockResolvedValue(availability);
    const res = await request(app).post('/user-availability').send({ userId: 'user-1', hoursPerDay: 8 });
    expect([200, 201]).toContain(res.status);
  });
});
