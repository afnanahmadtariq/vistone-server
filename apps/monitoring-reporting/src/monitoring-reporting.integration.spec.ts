/**
 * Monitoring & Reporting Service – Integration Tests
 */
jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    dashboard: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    dashboardWidget: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    kpiDefinition: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    kpiMeasurement: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    reportTemplate: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    generatedReport: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    automationRule: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    automationLog: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    memberPerformance: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    reportSchedule: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    aiConversation: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

import request from 'supertest';
import app from './app';
import prisma from './lib/prisma';

const dashboard = { id: 'dash-1', organizationId: 'org-1', name: 'Ops Dashboard', userId: 'user-1', isDefault: false, createdAt: new Date().toISOString() };
const kpiDef = { id: 'kpi-1', organizationId: 'org-1', name: 'Bug Resolution Time', unit: 'hours', target: 24, createdAt: new Date().toISOString() };
const reportTemplate = { id: 'rt-1', organizationId: 'org-1', name: 'Monthly Report', type: 'PROJECT', config: {}, createdAt: new Date().toISOString() };
const automationRule = { id: 'ar-1', organizationId: 'org-1', name: 'Auto Close', trigger: 'TASK_STATUS_CHANGE', conditions: {}, actions: {}, enabled: true, createdAt: new Date().toISOString() };

beforeEach(() => jest.clearAllMocks());

// ── Dashboards ─────────────────────────────────────────────────
describe('GET /dashboards', () => {
  it('returns 200 with dashboards', async () => {
    (prisma.dashboard.findMany as jest.Mock).mockResolvedValue([dashboard]);
    const res = await request(app).get('/dashboards');
    expect(res.status).toBe(200);
  });
});

describe('POST /dashboards', () => {
  it('creates a dashboard', async () => {
    (prisma.dashboard.create as jest.Mock).mockResolvedValue(dashboard);
    const res = await request(app).post('/dashboards').send({ organizationId: 'org-1', name: 'Ops Dashboard', userId: 'user-1' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /dashboards/:id', () => {
  it('returns 200 when dashboard exists', async () => {
    (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(dashboard);
    const res = await request(app).get('/dashboards/dash-1');
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    (prisma.dashboard.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get('/dashboards/missing');
    expect(res.status).toBe(404);
  });
});

// ── KPI Definitions ────────────────────────────────────────────
describe('GET /kpi-definitions', () => {
  it('returns 200', async () => {
    (prisma.kpiDefinition.findMany as jest.Mock).mockResolvedValue([kpiDef]);
    const res = await request(app).get('/kpi-definitions');
    expect(res.status).toBe(200);
  });
});

describe('POST /kpi-definitions', () => {
  it('creates a KPI definition', async () => {
    (prisma.kpiDefinition.create as jest.Mock).mockResolvedValue(kpiDef);
    const res = await request(app).post('/kpi-definitions').send({ organizationId: 'org-1', name: 'Bug Resolution Time', unit: 'hours' });
    expect([200, 201]).toContain(res.status);
  });
});

describe('GET /kpi-definitions/:id', () => {
  it('returns 200 when KPI exists', async () => {
    (prisma.kpiDefinition.findUnique as jest.Mock).mockResolvedValue(kpiDef);
    const res = await request(app).get('/kpi-definitions/kpi-1');
    expect(res.status).toBe(200);
  });
});

// ── KPI Measurements ───────────────────────────────────────────
describe('GET /kpi-measurements', () => {
  it('returns 200', async () => {
    (prisma.kpiMeasurement.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/kpi-measurements');
    expect(res.status).toBe(200);
  });
});

// ── Report Templates ───────────────────────────────────────────
describe('GET /report-templates', () => {
  it('returns 200', async () => {
    (prisma.reportTemplate.findMany as jest.Mock).mockResolvedValue([reportTemplate]);
    const res = await request(app).get('/report-templates');
    expect(res.status).toBe(200);
  });
});

describe('POST /report-templates', () => {
  it('creates a report template', async () => {
    (prisma.reportTemplate.create as jest.Mock).mockResolvedValue(reportTemplate);
    const res = await request(app).post('/report-templates').send({ organizationId: 'org-1', name: 'Monthly Report', type: 'PROJECT' });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Automation Rules ───────────────────────────────────────────
describe('GET /automation-rules', () => {
  it('returns 200', async () => {
    (prisma.automationRule.findMany as jest.Mock).mockResolvedValue([automationRule]);
    const res = await request(app).get('/automation-rules');
    expect(res.status).toBe(200);
  });
});

describe('POST /automation-rules', () => {
  it('creates an automation rule', async () => {
    (prisma.automationRule.create as jest.Mock).mockResolvedValue(automationRule);
    const res = await request(app).post('/automation-rules').send({ organizationId: 'org-1', name: 'Auto Close', trigger: 'TASK_STATUS_CHANGE' });
    expect([200, 201]).toContain(res.status);
  });
});

// ── Automation Logs ────────────────────────────────────────────
describe('GET /automation-logs', () => {
  it('returns 200', async () => {
    (prisma.automationLog.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/automation-logs');
    expect(res.status).toBe(200);
  });
});

// ── Generated Reports ──────────────────────────────────────────
describe('GET /generated-reports', () => {
  it('returns 200', async () => {
    (prisma.generatedReport.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/generated-reports');
    expect(res.status).toBe(200);
  });
});

// ── Member Performance ─────────────────────────────────────────
describe('GET /member-performance', () => {
  it('returns 200', async () => {
    (prisma.memberPerformance.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/member-performance');
    expect(res.status).toBe(200);
  });
});

// ── Report Schedules ───────────────────────────────────────────
describe('GET /report-schedules', () => {
  it('returns 200', async () => {
    (prisma.reportSchedule.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/report-schedules');
    expect(res.status).toBe(200);
  });
});

// ── AI Conversations ───────────────────────────────────────────
describe('GET /ai-conversations', () => {
  it('returns 200', async () => {
    (prisma.aiConversation.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/ai-conversations');
    expect(res.status).toBe(200);
  });
});

// ── Dashboard Widgets ──────────────────────────────────────────
describe('GET /dashboard-widgets', () => {
  it('returns 200', async () => {
    (prisma.dashboardWidget.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/dashboard-widgets');
    expect(res.status).toBe(200);
  });
});
