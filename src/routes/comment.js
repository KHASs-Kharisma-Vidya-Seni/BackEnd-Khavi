import { Router } from "express";
import { supabase } from "../helper/supabaseClient.js";
import { getForumById, getUserByIdInForum } from "../services/forum-service.js";
const router = Router();

router.get("/", async (req, res) => {
  const { withUser, id_forum } = req.query;

  try {
    const { data: comments, error } = await supabase.from("comments").select("*");

    if (withUser === "true") {
      const commentsWithUsers = await Promise.all(
        comments.map(async comment => {
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

    res.status(200).json(comments);
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

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Query komentar berdasarkan ID
    const { data: comment, error: commentError } = await supabase
      .from("comments")
      .select("*")
      .eq("id_comment", commentId)
      .single();

    if (commentError) throw commentError;

    // Toggle status pin komentar
    const updatedComment = { ...comment, pinned: !comment.pinned };
    delete updatedComment.id_comment; // Hapus id_comment dari objek

    // Update data komentar di Supabase
    const { error: updateError } = await supabase
      .from("comments")
      .update(updatedComment)
      .eq("id_comment", commentId);

    if (updateError) throw updateError;

    res.status(200).json({ message: "Comment pin status updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// router.post("/", async (req, res) => {
//   const { comment_content } = req.body;
//   try {
//     const { data, error } = await supabase.from("comments").insert(comment_content);

//     if (error) {
//       throw error;
//     }

//     res.json(data);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: error.message });
//   }
// });

export default router;
