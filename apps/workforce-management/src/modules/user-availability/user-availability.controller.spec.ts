import {
  createUserAvailabilityHandler,
  getAllUserAvailabilityHandler,
  getUserAvailabilityByIdHandler,
  updateUserAvailabilityHandler,
  deleteUserAvailabilityHandler,
} from './user-availability.controller';

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    userAvailability: {
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
  id: 'av-1',
  userId: 'user-1',
  startDate: new Date('2025-07-01'),
  endDate: new Date('2025-07-31'),
  hoursPerDay: 8,
  createdAt: new Date(),
};

describe('UserAvailability Controller – Unit Tests', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createUserAvailabilityHandler', () => {
    it('creates and returns availability', async () => {
      (prisma.userAvailability.create as jest.Mock).mockResolvedValue(sample);
      const req: any = { body: { userId: 'user-1', hoursPerDay: 8 } };
      const res = mockRes();

      await createUserAvailabilityHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 500 on error', async () => {
      (prisma.userAvailability.create as jest.Mock).mockRejectedValue(new Error('DB'));
      const req: any = { body: {} };
      const res = mockRes();

      await createUserAvailabilityHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAllUserAvailabilitiesHandler', () => {
    it('returns all availability records', async () => {
      (prisma.userAvailability.findMany as jest.Mock).mockResolvedValue([sample]);
      const req: any = { query: {} };
      const res = mockRes();

      await getAllUserAvailabilityHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([sample]);
    });
  });

  describe('getUserAvailabilityByIdHandler', () => {
    it('returns availability by id', async () => {
      (prisma.userAvailability.findUnique as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'av-1' } };
      const res = mockRes();

      await getUserAvailabilityByIdHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(sample);
    });

    it('returns 404 when not found', async () => {
      (prisma.userAvailability.findUnique as jest.Mock).mockResolvedValue(null);
      const req: any = { params: { id: 'missing' } };
      const res = mockRes();

      await getUserAvailabilityByIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUserAvailabilityHandler', () => {
    it('updates and returns availability', async () => {
      const updated = { ...sample, hoursPerDay: 6 };
      (prisma.userAvailability.update as jest.Mock).mockResolvedValue(updated);
      const req: any = { params: { id: 'av-1' }, body: { hoursPerDay: 6 } };
      const res = mockRes();

      await updateUserAvailabilityHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe('deleteUserAvailabilityHandler', () => {
    it('deletes availability and returns success', async () => {
      (prisma.userAvailability.delete as jest.Mock).mockResolvedValue(sample);
      const req: any = { params: { id: 'av-1' } };
      const res = mockRes();

      await deleteUserAvailabilityHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
