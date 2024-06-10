import { Router } from "express";
import {
  getUserById,
  getUsers,
  getUsersWithForums,
} from "../controllers/user-controller.js";

const router = Router();

router.get("/", getUsers);
router.get("/forum", getUsersWithForums);
router.get("/:id", getUserById);

export default router;
