import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { memberPerformanceSchema } from "./member-performance.schema";
import { createMemberPerformanceHandler, getAllMemberPerformancesHandler, getMemberPerformanceByIdHandler } from "./member-performance.controller";

const router = Router();
router.post('/', validateRequest(memberPerformanceSchema), createMemberPerformanceHandler);
router.get('/', getAllMemberPerformancesHandler);
router.get('/:id', getMemberPerformanceByIdHandler);
export default router;
