import { Router } from "express";
import { validateRequest } from "../../lib/validate";
import { userSchema, updateUserSchema } from "./users.schema";
import { createUserHandler, getAllUsersHandler, getUserByIdHandler, updateUserHandler, deleteUserHandler } from "./users.controller";

const router = Router();
router.post('/', validateRequest(userSchema), createUserHandler);
router.get('/', getAllUsersHandler);
router.get('/:id', getUserByIdHandler);
router.put('/:id', validateRequest(updateUserSchema), updateUserHandler);
router.delete('/:id', deleteUserHandler);
export default router;
