import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { userAvailabilitySchema, updateUserAvailabilitySchema } from "./user-availability.schema";
import { createUserAvailabilityHandler, getAllUserAvailabilityHandler, getUserAvailabilityByIdHandler, updateUserAvailabilityHandler, deleteUserAvailabilityHandler } from "./user-availability.controller";

const router = Router();
router.post('/', validateRequest(userAvailabilitySchema), createUserAvailabilityHandler);
router.get('/', getAllUserAvailabilityHandler);
router.get('/:id', getUserAvailabilityByIdHandler);
router.put('/:id', validateRequest(updateUserAvailabilitySchema), updateUserAvailabilityHandler);
router.delete('/:id', deleteUserAvailabilityHandler);
export default router;
