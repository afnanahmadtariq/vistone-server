import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import {
  createAttendanceLogSchema,
  purgeAttendanceForUserSchema,
  updateAttendanceLogSchema,
} from "./attendance-logs.schema";
import {
  createAttendanceLogHandler,
  listAttendanceLogsHandler,
  getAttendanceLogByIdHandler,
  updateAttendanceLogHandler,
  deleteAttendanceLogHandler,
  purgeAttendanceForUserHandler,
} from "./attendance-logs.controller";

const router = Router();

router.post("/purge-for-user", validateRequest(purgeAttendanceForUserSchema), purgeAttendanceForUserHandler);
router.post("/", validateRequest(createAttendanceLogSchema), createAttendanceLogHandler);
router.get("/", listAttendanceLogsHandler);
router.get("/:id", getAttendanceLogByIdHandler);
router.put("/:id", validateRequest(updateAttendanceLogSchema), updateAttendanceLogHandler);
router.delete("/:id", deleteAttendanceLogHandler);

export default router;
