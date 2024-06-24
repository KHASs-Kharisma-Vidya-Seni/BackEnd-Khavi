import { Router } from "express";
import { getForumById, getUserByIdInForum } from "../services/forum-service.js";
import pool from "../lib/db-neon.js";

const router = Router();

router.get("/", async (req, res) => {
  const { withUser, id_forum } = req.query;

  try {
    const client = await pool.connect();
    try {
      let commentsQuery = "SELECT * FROM comment";

      if (id_forum) {
        commentsQuery += " WHERE id_forum = $1";
      }

      const { rows } = await client.query(commentsQuery, [id_forum]);

      if (withUser === "true") {
        const commentsWithUsers = await Promise.all(
          rows.map(async comment => {
            const { user, error } = await getUserByIdInForum(comment.id_user, true);
            const { forum } = await getForumById(comment.id_forum);

            if (error) {
              throw error;
            }

            delete comment.id_user;
            return { ...comment, forum, user };
          }),
        );

        return res.status(200).json(commentsWithUsers);
      }

      res.status(200).json(rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk memperbarui status pin komentar
router.put("/:commentId/pin", async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.uid;

    // Fetch comment from PostgreSQL
    const client = await pool.connect();
    try {
      const commentQuery = "SELECT * FROM comment WHERE id_comment = $1";
      const { rows } = await client.query(commentQuery, [commentId]);

      if (rows.length === 0) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const comment = rows[0];

      // Check if user is authorized to update the comment
      if (comment.id_user !== userId) {
        return res.status(403).json({ error: "You are not authorized to update this comment" });
      }

      // Toggle pin status
      const updatedPinnedStatus = !comment.pinned;

      // Update comment in PostgreSQL
      const updateCommentQuery = "UPDATE comment SET pinned = $1 WHERE id_comment = $2";
      await client.query(updateCommentQuery, [updatedPinnedStatus, commentId]);

      return res.status(200).json({ message: "Comment pin status updated successfully" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});


export default router;
