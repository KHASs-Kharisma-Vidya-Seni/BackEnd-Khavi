import { Router } from "express";
import upload from "../helper/multer.js";
import configureEnvSelf from "../utility/dote-env.js";

import {
  createCommentForum,
  createForum,
  deleteUserById,
  getForumById,
  getForums,
  updateForumById,
} from "../controllers/forum-controller.js";

configureEnvSelf();

const router = Router();

router.get("/", getForums);

router.post("/", upload.single("image"), createForum);

router.get("/:id", getForumById);

router.patch("/:id", upload.single("image"), updateForumById);

router.delete("/:id", deleteUserById);

router.post("/:id_forum/comments", createCommentForum);


export default router;
