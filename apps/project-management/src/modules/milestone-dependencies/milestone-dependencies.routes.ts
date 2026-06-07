import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import {
  milestoneDependencySchema,
  replaceMilestoneDependenciesSchema,
} from "./milestone-dependencies.schema";
import {
  getAllMilestoneDependenciesHandler,
  createMilestoneDependencyHandler,
  replaceMilestoneDependenciesHandler,
  deleteMilestoneDependencyHandler,
} from "./milestone-dependencies.controller";

const router = Router();

router.get("/", getAllMilestoneDependenciesHandler);
router.post("/", validateRequest(milestoneDependencySchema), createMilestoneDependencyHandler);
router.post(
  "/replace",
  validateRequest(replaceMilestoneDependenciesSchema),
  replaceMilestoneDependenciesHandler,
);
router.delete("/:id", deleteMilestoneDependencyHandler);

export default router;
