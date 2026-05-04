/**
 * Project Management Service – Integration Tests
 */
jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    project: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    projectMember: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    task: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    taskChecklist: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    taskDependency: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    milestone: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    riskRegister: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    aiInsight: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import request from 'supertest';
import app from './app';
import prisma from './lib/prisma';

const project = { id: 'proj-1', organizationId: 'org-1', name: 'Alpha', status: 'ACTIVE', progress: 0, budget: 0, createdAt: new Date().toISOString() };
const task = { id: 'task-1', projectId: 'proj-1', title: 'Write Tests', status: 'TODO', createdAt: new Date().toISOString() };
const milestone = { id: 'ms-1', projectId: 'proj-1', title: 'MVP', dueDate: null, status: 'PENDING', createdAt: new Date().toISOString() };
const risk = { id: 'risk-1', projectId: 'proj-1', title: 'Scope Creep', impact: 'HIGH', probability: 'MEDIUM', status: 'OPEN', createdAt: new Date().toISOString() };

beforeEach(() => jest.clearAllMocks());

// ── Projects ──────────────────────────────────────────────────
describe('GET /projects', () => {
  it('returns 200 with projects array', async () => {
    (prisma.project.findMany as jest.Mock).mockResolvedValue([project]);
    const res = await request(app).get('/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /projects', () => {
  it('creates a project', async () => {
    (prisma.project.create as jest.Mock).mockResolvedValue(project);
    const res = await request(app).post('/projects').send({ organizationId: 'org-1', name: 'Alpha', status: 'ACTIVE' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /projects/:id', () => {
  it('returns 200 when project exists', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(project);
    const res = await request(app).get('/projects/proj-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/projects/missing');
    expect(res.status).toBe(404);
  });
});

describe('PUT /projects/:id', () => {
  it('updates a project', async () => {
    (prisma.project.update as jest.Mock).mockResolvedValue({ ...project, name: 'Beta' });
    const res = await request(app).put('/projects/proj-1').send({ name: 'Beta' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /projects/:id', () => {
  it('deletes a project', async () => {
    (prisma.project.delete as jest.Mock).mockResolvedValue(project);
    const res = await request(app).delete('/projects/proj-1');
    expect(res.status).toBe(200);
  });
});

// ── Tasks ─────────────────────────────────────────────────────
describe('GET /tasks', () => {
  it('returns 200 with tasks array', async () => {
    (prisma.task.findMany as jest.Mock).mockResolvedValue([task]);
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
  });
});

describe('POST /tasks', () => {
  it('creates a task', async () => {
    (prisma.task.create as jest.Mock).mockResolvedValue(task);
    const res = await request(app).post('/tasks').send({ projectId: 'proj-1', title: 'Write Tests', status: 'TODO' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /tasks/:id', () => {
  it('returns 200 when task exists', async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(task);
    const res = await request(app).get('/tasks/task-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when task is not found', async () => {
    (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/tasks/missing');
    expect(res.status).toBe(404);
  });
});

// ── Milestones ────────────────────────────────────────────────
describe('GET /milestones', () => {
  it('returns 200', async () => {
    (prisma.milestone.findMany as jest.Mock).mockResolvedValue([milestone]);
    const res = await request(app).get('/milestones');
    expect(res.status).toBe(200);
  });
});

describe('POST /milestones', () => {
  it('creates a milestone', async () => {
    (prisma.milestone.create as jest.Mock).mockResolvedValue(milestone);
    const res = await request(app).post('/milestones').send({ projectId: 'proj-1', title: 'MVP' });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Risk Register ─────────────────────────────────────────────
describe('GET /risk-register', () => {
  it('returns 200', async () => {
    (prisma.riskRegister.findMany as jest.Mock).mockResolvedValue([risk]);
    const res = await request(app).get('/risk-register');
    expect(res.status).toBe(200);
  });
});

describe('POST /risk-register', () => {
  it('creates a risk', async () => {
    (prisma.riskRegister.create as jest.Mock).mockResolvedValue(risk);
    const res = await request(app).post('/risk-register').send({ projectId: 'proj-1', description: 'Scope Creep', impact: 'HIGH', probability: 'MEDIUM', status: 'OPEN' });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Task Checklists ───────────────────────────────────────────
describe('GET /task-checklists', () => {
  it('returns 200', async () => {
    (prisma.taskChecklist.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/task-checklists');
    expect(res.status).toBe(200);
  });
});

// ── Task Dependencies ─────────────────────────────────────────
describe('GET /task-dependencies', () => {
  it('returns 200', async () => {
    (prisma.taskDependency.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/task-dependencies');
    expect(res.status).toBe(200);
  });
});

// ── AI Insights ───────────────────────────────────────────────
describe('GET /ai-insights', () => {
  it('returns 200', async () => {
    (prisma.aiInsight.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/ai-insights');
    expect(res.status).toBe(200);
  });
});

// ── Project Members ───────────────────────────────────────────
describe('GET /project-members', () => {
  it('returns 200', async () => {
    (prisma.projectMember.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/project-members');
    expect(res.status).toBe(200);
  });
});
