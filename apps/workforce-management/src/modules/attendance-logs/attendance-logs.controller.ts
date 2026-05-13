import { Request, Response } from "express";
import type { RequestWithInternalUser } from "@vistone-server/shared-internal-auth";
import prisma from "../../lib/prisma";

function internalUser(req: Request) {
  return (req as RequestWithInternalUser).internalUser;
}

function isOrganizerRole(role: string | undefined): boolean {
  return (role || "").toLowerCase() === "organizer";
}

function parseWorkDate(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(Date.UTC(y, mo, d));
}

export async function purgeAttendanceForUserHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!isOrganizerRole(u.role)) {
      res.status(403).json({ error: "Only organizers can purge attendance records" });
      return;
    }
    const { userId, organizationId } = req.body as { userId: string; organizationId: string };
    if (!userId || !organizationId) {
      res.status(400).json({ error: "userId and organizationId are required" });
      return;
    }
    if (u.organizationId !== organizationId) {
      res.status(403).json({ error: "Organization mismatch" });
      return;
    }
    const result = await prisma.attendanceLog.deleteMany({
      where: { userId, organizationId },
    });
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to purge attendance logs" });
  }
}

export async function createAttendanceLogHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id || !u.organizationId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { organizationId, workDate, hoursWorked, notes } = req.body as {
      organizationId: string;
      workDate: string;
      hoursWorked: number;
      notes?: string | null;
    };
    if (organizationId !== u.organizationId) {
      res.status(403).json({ error: "Cannot log attendance for another organization" });
      return;
    }
    const wd = parseWorkDate(workDate);
    if (!wd) {
      res.status(400).json({ error: "Invalid workDate" });
      return;
    }
    const row = await prisma.attendanceLog.create({
      data: {
        organizationId,
        userId: u.id,
        workDate: wd,
        hoursWorked,
        notes: notes ?? null,
      },
    });
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create attendance log" });
  }
}

export async function listAttendanceLogsHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id || !u.organizationId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const organizationId = req.query.organizationId as string | undefined;
    if (!organizationId || organizationId !== u.organizationId) {
      res.status(400).json({ error: "organizationId query must match your organization" });
      return;
    }
    const workDateFrom = req.query.workDateFrom as string | undefined;
    const workDateTo = req.query.workDateTo as string | undefined;
    const requestedUserId = req.query.userId as string | undefined;

    const where: {
      organizationId: string;
      userId?: string;
      workDate?: { gte?: Date; lte?: Date };
    } = { organizationId };

    if (isOrganizerRole(u.role)) {
      if (requestedUserId) {
        where.userId = requestedUserId;
      }
    } else {
      where.userId = u.id;
    }

    if (workDateFrom || workDateTo) {
      where.workDate = {};
      if (workDateFrom) {
        const from = parseWorkDate(workDateFrom);
        if (from) where.workDate.gte = from;
      }
      if (workDateTo) {
        const to = parseWorkDate(workDateTo);
        if (to) where.workDate.lte = to;
      }
    }

    const rows = await prisma.attendanceLog.findMany({
      where,
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
    });
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to list attendance logs" });
  }
}

export async function getAttendanceLogByIdHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const row = await prisma.attendanceLog.findUnique({
      where: { id: req.params.id },
    });
    if (!row) {
      res.status(404).json({ error: "Attendance log not found" });
      return;
    }
    if (row.organizationId !== u.organizationId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!isOrganizerRole(u.role) && row.userId !== u.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch attendance log" });
  }
}

export async function updateAttendanceLogHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const existing = await prisma.attendanceLog.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Attendance log not found" });
      return;
    }
    if (existing.organizationId !== u.organizationId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!isOrganizerRole(u.role) && existing.userId !== u.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const body = req.body as { workDate?: string; hoursWorked?: number; notes?: string | null };
    const data: Record<string, unknown> = {};
    if (body.workDate !== undefined) {
      const wd = parseWorkDate(body.workDate);
      if (!wd) {
        res.status(400).json({ error: "Invalid workDate" });
        return;
      }
      data.workDate = wd;
    }
    if (body.hoursWorked !== undefined) data.hoursWorked = body.hoursWorked;
    if (body.notes !== undefined) data.notes = body.notes;

    const row = await prisma.attendanceLog.update({
      where: { id: req.params.id },
      data,
    });
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update attendance log" });
  }
}

export async function deleteAttendanceLogHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const existing = await prisma.attendanceLog.findUnique({
      where: { id: req.params.id },
    });
    if (!existing) {
      res.status(404).json({ error: "Attendance log not found" });
      return;
    }
    if (existing.organizationId !== u.organizationId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!isOrganizerRole(u.role) && existing.userId !== u.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await prisma.attendanceLog.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Attendance log deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete attendance log" });
  }
}
