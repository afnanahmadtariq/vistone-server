/**
 * Auth Service – Integration Tests
 * Mocks prisma and tests the full HTTP stack with supertest.
 */

jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('mock-uuid') }));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organization: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    role: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
    kycData: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mfaSetting: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import request from 'supertest';
import app from './app';
import prisma from './lib/prisma';

const userPayload = {
  id: 'u-1',
  email: 'alice@test.com',
  firstName: 'Alice',
  lastName: 'Smith',
  passwordHash: 'hash',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const orgPayload = {
  id: 'org-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  settings: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

// ── Users ────────────────────────────────────────────────────
describe('GET /users', () => {
  it('returns 200 with users array', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([userPayload]);
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 500 on database error', async () => {
    (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('DB fail'));
    const res = await request(app).get('/users');
    expect(res.status).toBe(500);
  });
});

describe('GET /users/:id', () => {
  it('returns 200 when user exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userPayload);
    const res = await request(app).get('/users/u-1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'u-1' });
  });

  it('returns 404 when user does not exist', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/users/missing');
    expect(res.status).toBe(404);
  });
});

describe('POST /users', () => {
  it('returns 200/201 when creating a user', async () => {
    (prisma.user.create as jest.Mock).mockResolvedValue(userPayload);
    const res = await request(app)
      .post('/users')
      .send({ email: 'alice@test.com', firstName: 'Alice', lastName: 'Smith' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('PUT /users/:id', () => {
  it('returns 200 when updating a user', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...userPayload, firstName: 'Alicia' });
    const res = await request(app).put('/users/u-1').send({ firstName: 'Alicia' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /users/:id', () => {
  it('returns 200 when deleting a user', async () => {
    (prisma.user.delete as jest.Mock).mockResolvedValue(userPayload);
    const res = await request(app).delete('/users/u-1');
    expect(res.status).toBe(200);
  });
});

// ── Organizations ─────────────────────────────────────────────
describe('GET /organizations', () => {
  it('returns 200 with organizations array', async () => {
    (prisma.organization.findMany as jest.Mock).mockResolvedValue([orgPayload]);
    const res = await request(app).get('/organizations');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /organizations', () => {
  it('creates an organization', async () => {
    (prisma.organization.create as jest.Mock).mockResolvedValue(orgPayload);
    const res = await request(app).post('/organizations').send({ name: 'Acme Corp' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /organizations/:id', () => {
  it('returns 200 when org exists', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(orgPayload);
    const res = await request(app).get('/organizations/org-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/organizations/missing');
    expect(res.status).toBe(404);
  });
});

// ── Roles ─────────────────────────────────────────────────────
describe('GET /roles', () => {
  it('returns 200 with roles array', async () => {
    (prisma.role.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/roles');
    expect(res.status).toBe(200);
  });
});

describe('GET /roles/definitions', () => {
  it('returns 200 with role definitions', async () => {
    const res = await request(app).get('/roles/definitions');
    expect(res.status).toBe(200);
  });
});

// ── Activity Logs ─────────────────────────────────────────────
describe('POST /activity-logs', () => {
  it('creates an activity log', async () => {
    (prisma.activityLog.create as jest.Mock).mockResolvedValue({ id: 'log-1', userId: 'u-1', action: 'LOGIN', entityType: 'auth' });
    const res = await request(app)
      .post('/activity-logs')
      .send({ userId: 'u-1', action: 'LOGIN', entityType: 'auth' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /activity-logs', () => {
  it('returns 200 with logs array', async () => {
    (prisma.activityLog.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/activity-logs');
    expect(res.status).toBe(200);
  });
});

// ── KYC Data ─────────────────────────────────────────────────
describe('GET /kyc-data', () => {
  it('returns 200', async () => {
    (prisma.kycData.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/kyc-data');
    expect(res.status).toBe(200);
  });
});

// ── MFA Settings ─────────────────────────────────────────────
describe('GET /mfa-settings', () => {
  it('returns 200', async () => {
    (prisma.mfaSetting.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/mfa-settings');
    expect(res.status).toBe(200);
  });
});
