import { Router } from "express";
import {
  deleteUser,
  getUserById,
  getUsers,
  getUsersWithForums,
  updateUserProfile,
} from "../controllers/user-controller.js";
import upload from "../helper/multer.js";

const router = Router();

router.get("/", getUsers);
router.get("/forum", getUsersWithForums);
router.get("/:id", getUserById);
router.patch("/:id", upload.single("image"), updateUserProfile);
router.delete("/:id/delete", deleteUser);

export default router;
