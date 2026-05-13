import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import {
  createTaskSubmissionSchema,
  updateTaskSubmissionSchema,
  reviewTaskSubmissionSchema,
} from "./task-submissions.schema";
import {
  createTaskSubmissionHandler,
  getTaskSubmissionsHandler,
  getTaskSubmissionByIdHandler,
  updateTaskSubmissionHandler,
  reviewTaskSubmissionHandler,
} from "./task-submissions.controller";

const router = Router();

router.post("/", validateRequest(createTaskSubmissionSchema), createTaskSubmissionHandler);
router.get("/", getTaskSubmissionsHandler);
router.post(
  "/:id/review",
  validateRequest(reviewTaskSubmissionSchema),
  reviewTaskSubmissionHandler
);
router.get("/:id", getTaskSubmissionByIdHandler);
router.put("/:id", validateRequest(updateTaskSubmissionSchema), updateTaskSubmissionHandler);

export default router;
