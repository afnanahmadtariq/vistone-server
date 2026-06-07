/**
 * Client Management Service – Integration Tests
 */
jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    client: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    projectClient: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    clientFeedback: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    proposal: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import request from 'supertest';
import app from './app';
import prisma from './lib/prisma';

const client = { id: 'client-1', name: 'GlobalCorp', email: 'info@globalcorp.com', status: 'ACTIVE', createdAt: new Date().toISOString() };
const feedback = { id: 'fb-1', clientId: 'client-1', rating: 5, comment: 'Great!', createdAt: new Date().toISOString() };
const proposal = { id: 'prop-1', clientId: 'client-1', title: 'Website Proposal', status: 'DRAFT', budget: 50000, createdAt: new Date().toISOString() };
const projectClient = { id: 'pc-1', projectId: 'proj-1', clientId: 'client-1', role: 'STAKEHOLDER', createdAt: new Date().toISOString() };

beforeEach(() => jest.clearAllMocks());

// ── Clients ────────────────────────────────────────────────────
describe('GET /clients', () => {
  it('returns 200 with clients array', async () => {
    (prisma.client.findMany as jest.Mock).mockResolvedValue([client]);
    const res = await request(app).get('/clients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /clients', () => {
  it('creates a client', async () => {
    (prisma.client.create as jest.Mock).mockResolvedValue(client);
    const res = await request(app).post('/clients').send({ name: 'GlobalCorp', email: 'info@globalcorp.com' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /clients/:id', () => {
  it('returns 200 when client exists', async () => {
    (prisma.client.findUnique as jest.Mock).mockResolvedValue(client);
    const res = await request(app).get('/clients/client-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/clients/missing');
    expect(res.status).toBe(404);
  });
});

describe('PUT /clients/:id', () => {
  it('updates a client', async () => {
    (prisma.client.update as jest.Mock).mockResolvedValue({ ...client, status: 'INACTIVE' });
    const res = await request(app).put('/clients/client-1').send({ status: 'INACTIVE' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /clients/:id', () => {
  it('deletes a client', async () => {
    (prisma.client.delete as jest.Mock).mockResolvedValue(client);
    const res = await request(app).delete('/clients/client-1');
    expect(res.status).toBe(200);
  });
});

// ── Proposals ─────────────────────────────────────────────────
describe('GET /proposals', () => {
  it('returns 200', async () => {
    (prisma.proposal.findMany as jest.Mock).mockResolvedValue([proposal]);
    const res = await request(app).get('/proposals');
    expect(res.status).toBe(200);
  });
});

describe('POST /proposals', () => {
  it('creates a proposal', async () => {
    (prisma.proposal.create as jest.Mock).mockResolvedValue(proposal);
    const res = await request(app).post('/proposals').send({ clientId: 'client-1', title: 'Website Proposal', status: 'DRAFT' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /proposals/:id', () => {
  it('returns 200 when proposal exists', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(proposal);
    const res = await request(app).get('/proposals/prop-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.proposal.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/proposals/missing');
    expect(res.status).toBe(404);
  });
});

// ── Client Feedback ───────────────────────────────────────────
describe('GET /client-feedback', () => {
  it('returns 200', async () => {
    (prisma.clientFeedback.findMany as jest.Mock).mockResolvedValue([feedback]);
    const res = await request(app).get('/client-feedback');
    expect(res.status).toBe(200);
  });
});

describe('POST /client-feedback', () => {
  it('creates feedback', async () => {
    (prisma.clientFeedback.create as jest.Mock).mockResolvedValue(feedback);
    const res = await request(app).post('/client-feedback').send({ clientId: 'client-1', rating: 5 });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Project Clients ───────────────────────────────────────────
describe('GET /project-clients', () => {
  it('returns 200', async () => {
    (prisma.projectClient.findMany as jest.Mock).mockResolvedValue([projectClient]);
    const res = await request(app).get('/project-clients');
    expect(res.status).toBe(200);
  });
});

describe('POST /project-clients', () => {
  it('creates project-client link', async () => {
    (prisma.projectClient.create as jest.Mock).mockResolvedValue(projectClient);
    const res = await request(app).post('/project-clients').send({ projectId: 'proj-1', clientId: 'client-1' });
    expect([200, 201]).toContain(res.status);
  });
});
