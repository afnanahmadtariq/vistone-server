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

/** Calendar date (UTC midnight) for an instant — used as payroll workDate for a live session. */
function workDateUtcFromInstant(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function purgeAttendanceForUserHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id) {
      res.status(401).json({ error: "Authentication required" });
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
    const isSelfPurge = u.id === userId;
    if (!isOrganizerRole(u.role) && !isSelfPurge) {
      res.status(403).json({ error: "Only organizers can purge attendance records" });
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

/** Deprecated: staff must use clock-in / clock-out. */
export async function createAttendanceLogHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id || !u.organizationId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const organizationId = (req.body as { organizationId?: string })?.organizationId;
    if (organizationId && organizationId !== u.organizationId) {
      res.status(403).json({ error: "Cannot log attendance for another organization" });
      return;
    }
    res.status(403).json({
      error:
        "Manual day/hour entries are disabled. Use Start now and End now on the Attendance page so hours are calculated automatically.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create attendance log" });
  }
}

export async function clockInAttendanceHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id || !u.organizationId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { organizationId } = req.body as { organizationId: string };
    if (organizationId !== u.organizationId) {
      res.status(403).json({ error: "Cannot log attendance for another organization" });
      return;
    }
    if (isOrganizerRole(u.role)) {
      res.status(403).json({ error: "Organizers can view attendance but cannot clock in" });
      return;
    }
    const open = await prisma.attendanceLog.findFirst({
      where: {
        organizationId,
        userId: u.id,
        startedAt: { not: null },
        endedAt: null,
      },
    });
    if (open) {
      res.status(409).json({ error: "You already have an active session. End it before starting a new one." });
      return;
    }
    const startedAt = new Date();
    const workDate = workDateUtcFromInstant(startedAt);
    const row = await prisma.attendanceLog.create({
      data: {
        organizationId,
        userId: u.id,
        workDate,
        startedAt,
        endedAt: null,
        hoursWorked: null,
        notes: null,
      },
    });
    res.status(201).json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to clock in" });
  }
}

export async function clockOutAttendanceHandler(req: Request, res: Response) {
  try {
    const u = internalUser(req);
    if (!u?.id || !u.organizationId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { organizationId, logId } = req.body as { organizationId: string; logId?: string };
    if (organizationId !== u.organizationId) {
      res.status(403).json({ error: "Cannot log attendance for another organization" });
      return;
    }
    if (isOrganizerRole(u.role)) {
      res.status(403).json({ error: "Organizers can view attendance but cannot clock out" });
      return;
    }
    const open = logId
      ? await prisma.attendanceLog.findFirst({
          where: {
            id: logId,
            organizationId,
            userId: u.id,
            startedAt: { not: null },
            endedAt: null,
          },
        })
      : await prisma.attendanceLog.findFirst({
          where: {
            organizationId,
            userId: u.id,
            startedAt: { not: null },
            endedAt: null,
          },
        });
    if (!open || !open.startedAt) {
      res.status(404).json({ error: "No active session to end." });
      return;
    }
    const endedAt = new Date();
    const rawHours = (endedAt.getTime() - open.startedAt.getTime()) / 3_600_000;
    if (rawHours > 24) {
      res.status(400).json({ error: "Session is longer than 24 hours. Contact an organizer if this is a mistake." });
      return;
    }
    if (rawHours < 0) {
      res.status(400).json({ error: "Invalid session times." });
      return;
    }
    const rounded = Math.round(rawHours * 100) / 100;
    const hoursVal = Math.max(1 / 60, rounded);
    const hoursWorked = Number(hoursVal.toFixed(2));

    const row = await prisma.attendanceLog.update({
      where: { id: open.id },
      data: {
        endedAt,
        hoursWorked,
      },
    });
    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to clock out" });
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

    const openShiftClause = {
      startedAt: { not: null } as const,
      endedAt: null,
    };

    const workDateFilter: { gte?: Date; lte?: Date } = {};
    if (workDateFrom) {
      const from = parseWorkDate(workDateFrom);
      if (from) workDateFilter.gte = from;
    }
    if (workDateTo) {
      const to = parseWorkDate(workDateTo);
      if (to) workDateFilter.lte = to;
    }

    const where: {
      organizationId: string;
      userId?: string;
      OR?: Array<Record<string, unknown>>;
    } = { organizationId };

    if (isOrganizerRole(u.role)) {
      if (requestedUserId) {
        where.userId = requestedUserId;
      }
    } else {
      where.userId = u.id;
    }

    if (Object.keys(workDateFilter).length > 0) {
      where.OR = [{ workDate: workDateFilter }, openShiftClause];
    }

    const rows = await prisma.attendanceLog.findMany({
      where,
      orderBy: [{ endedAt: "desc" }, { workDate: "desc" }, { createdAt: "desc" }],
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
    res.status(403).json({
      error:
        "Attendance entries cannot be edited. Hours come from Start/End times; delete a row only if it was logged by mistake.",
    });
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
    if (isOrganizerRole(u.role)) {
      res.status(403).json({ error: "Organizers can view attendance but cannot delete entries" });
      return;
    }
    await prisma.attendanceLog.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Attendance log deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete attendance log" });
  }
}
