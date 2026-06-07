import {
  createAutomationRuleHandler,
  getAllAutomationRulesHandler,
  getAutomationRuleByIdHandler,
  updateAutomationRuleHandler,
  deleteAutomationRuleHandler,
} from './automation-rules.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    automationRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

const sample = {
  id: 'ar-1',
  organizationId: 'org-1',
  name: 'Auto Close Resolved Tasks',
  trigger: 'TASK_STATUS_CHANGE',
  conditions: {},
  actions: {},
  enabled: true,
  createdAt: new Date(),
};

describe('AutomationRules Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createAutomationRuleHandler', () => {
    it('creates and returns an automation rule', async () => {
      (prisma.automationRule.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { organizationId: 'org-1', name: 'Auto Close Resolved Tasks', trigger: 'TASK_STATUS_CHANGE' } };
      const res = mockRes();
      await createAutomationRuleHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 500 on error', async () => {
      (prisma.automationRule.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();
      await createAutomationRuleHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllAutomationRulesHandler', () => {
    it('returns all automation rules', async () => {
      (prisma.automationRule.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();
      await getAllAutomationRulesHandler(req, res);
      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getAutomationRuleByIdHandler', () => {
    it('returns rule by id', async () => {
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'ar-1' } };
      const res = mockRes();
      await getAutomationRuleByIdHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(sample);
    });
    it('returns 404 when not found', async () => {
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();
      await getAutomationRuleByIdHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateAutomationRuleHandler', () => {
    it('updates and returns rule', async () => {
      const updated = { ...sample, enabled: false };
      (prisma.automationRule.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'ar-1' }, body: { enabled: false } };
      const res = mockRes();
      await updateAutomationRuleHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteAutomationRuleHandler', () => {
    it('deletes rule and returns success', async () => {
      (prisma.automationRule.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'ar-1' } };
      const res = mockRes();
      await deleteAutomationRuleHandler(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
