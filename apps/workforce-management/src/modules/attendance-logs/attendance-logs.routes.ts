import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import {
  clockInAttendanceSchema,
  clockOutAttendanceSchema,
  purgeAttendanceForUserSchema,
} from "./attendance-logs.schema";
import {
  clockInAttendanceHandler,
  clockOutAttendanceHandler,
  createAttendanceLogHandler,
  listAttendanceLogsHandler,
  getAttendanceLogByIdHandler,
  updateAttendanceLogHandler,
  deleteAttendanceLogHandler,
  purgeAttendanceForUserHandler,
} from "./attendance-logs.controller";

const router = Router();

router.post("/purge-for-user", validateRequest(purgeAttendanceForUserSchema), purgeAttendanceForUserHandler);
router.post("/clock-in", validateRequest(clockInAttendanceSchema), clockInAttendanceHandler);
router.post("/clock-out", validateRequest(clockOutAttendanceSchema), clockOutAttendanceHandler);
router.post("/", createAttendanceLogHandler);
router.get("/", listAttendanceLogsHandler);
router.get("/:id", getAttendanceLogByIdHandler);
router.put("/:id", updateAttendanceLogHandler);
router.delete("/:id", deleteAttendanceLogHandler);

export default router;
