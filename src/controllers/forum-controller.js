import asyncHandler from "express-async-handler";
import moment from "moment";
import pool from "../lib/db-neon.js";

import "moment-timezone";

import { supabase, supabaseBucket } from "../helper/supabaseClient.js";
import { getForumWithComments } from "../services/forum-service.js";

moment.tz("Asia/Jakarta");

const createForum = asyncHandler(async (req, res) => {
  // console.log(req.user);
  try {
    const { content } = req.body;
    const image = req.file;
    const { uid } = req.user;
    const id_user = uid;

    const timestamp = Date.now();

    const nameFile = timestamp + "_" + image.originalname;

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseBucket.upload(
      `images/${nameFile}`,
      image.buffer,
      {
        contentType: image.mimetype,
      },
    );

    if (uploadError) throw uploadError;

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/images/${nameFile}`;

    const createdAtLocal = moment().format("YYYY-MM-DD HH:mm:ss");

    // Save forum data to PostgreSQL
    const client = await pool.connect();
    try {
      const insertQuery = `
          INSERT INTO forum (content, image, id_user, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
      const result = await client.query(insertQuery, [
        content,
        imageUrl,
        id_user,
        createdAtLocal,
        createdAtLocal,
      ]);
      const forum = result.rows[0];

      return res.status(201).json({
        message: "Forum berhasil dibuat",
        forum,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

const getForums = asyncHandler(async (req, res) => {
  const { withUser, q } = req.query;
  try {
    const forumCommentsWithUsers = await getForumWithComments(withUser === "true");
    res.json(forumCommentsWithUsers);

    // return res.status(200).json(forum);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const getForumById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      const forumQuery = `
        SELECT 
          f.id_forum, 
          f.content, 
          f.image, 
          f.created_at, 
          f.id_user, 
          u.uid, 
          u.username, 
          u.email
        FROM 
          forum f
        JOIN 
          users u 
        ON 
          f.id_user = u.uid
        WHERE 
          f.id_forum = $1
      `;
      const forumResult = await client.query(forumQuery, [id]);

      if (forumResult.rows.length === 0) {
        return res.status(404).json({ message: "Forum tidak ditemukan" });
      }

      const forumRow = forumResult.rows[0];
      const forum = {
        id_forum: forumRow.id_forum,
        content: forumRow.content,
        image: forumRow.image,
        created_at: forumRow.created_at,
        id_user: forumRow.id_user,
        user: {
          uid: forumRow.uid,
          email: forumRow.email,
          username: forumRow.username,
        },
      };

      return res.status(200).json(forum);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

const updateForumById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const image = req.file;

    // Mendapatkan informasi pengguna dari token akses
    const { uid } = req.user;
    const userId = uid;

    if (!userId)
      return res.status(403).json({ message: "Anda tidak diizinkan mengupdate forum ini" });

    const client = await pool.connect();
    try {
      // Mengambil informasi forum dari database PostgreSQL
      const forumQuery = "SELECT id_user, image, content FROM forum WHERE id_forum = $1";
      const forumResult = await client.query(forumQuery, [id]);

      if (forumResult.rows.length === 0)
        return res.status(404).json({ message: "Forum tidak ditemukan" });

      const forumData = forumResult.rows[0];

      // Memeriksa apakah pengguna adalah pemilik forum
      if (forumData.id_user !== userId) {
        return res.status(403).json({ message: "Anda tidak diizinkan mengupdate forum ini" });
      }

      let imageUrl = forumData.image;

      const timestamp = Date.now();

      // Menghapus gambar lama dari penyimpanan Supabase jika ada dan Mengunggah gambar baru jika ada
      if (image) {
        if (forumData.image) {
          const fileName = forumData.image.split("/").pop();
          const { data: deleteData, error: deleteError } = await supabase.storage
            .from("images")
            .remove([`images/${fileName}`]);

          if (deleteError) throw deleteError;
        }

        // Mengunggah gambar baru ke Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("images")
          .upload(`images/${timestamp}_${image.originalname}`, image.buffer, {
            contentType: image.mimetype,
          });

        if (uploadError) throw uploadError;

        imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/images/${image.originalname}`;
      }

      const updateAtLocal = moment().format();

      // Memperbarui forum di PostgreSQL
      const updateQuery =
        "UPDATE forum SET content = $1, image = $2, updated_at = $3 WHERE id_forum = $4";
      await client.query(updateQuery, [content, imageUrl, updateAtLocal, id]);

      return res.status(200).json({
        message: "Forum berhasil diupdate",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

const deleteUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user; // User ID from the access token

    const client = await pool.connect();
    try {
      // Retrieve forum details from PostgreSQL
      const forumQuery = "SELECT id_user, image FROM forum WHERE id_forum = $1";
      const forumResult = await client.query(forumQuery, [id]);

      if (forumResult.rows.length === 0) {
        return res.status(404).json({ message: "Forum tidak ditemukan" });
      }

      const forumData = forumResult.rows[0];

      console.log("req body", uid);
      console.log("forumData", forumData);

      // Check if the user is the owner of the forum
      if (forumData.id_user !== uid) {
        return res.status(403).json({
          message: "Anda tidak diizinkan menghapus forum ini",
          userId: uid,
          forumData,
        });
      }

      // Delete image from Supabase Storage if exists
      if (forumData.image) {
        const fileName = forumData.image.split("/").pop();
        const { error: deleteError } = await supabase.storage
          .from("images")
          .remove([`images/${fileName}`]);

        if (deleteError) throw deleteError;
      }

      // Delete forum from PostgreSQL
      const deleteForumQuery = "DELETE FROM forum WHERE id_forum = $1";
      await client.query(deleteForumQuery, [id]);

      return res.status(200).json({ message: "Forum berhasil dihapus" });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

const createCommentForum = asyncHandler(async (req, res) => {
  const { id_forum } = req.params;
  const { id_user, comment_content } = req.body;

  try {
    // Check if required fields are provided
    if (!id_user || !comment_content) {
      return res.status(400).json({ error: "id_user and comment_content are required" });
    }

    const created_at = moment().format();
    const client = await pool.connect();
    try {
      // Insert the comment into the PostgreSQL database
      const insertCommentQuery = `
        INSERT INTO comment (id_forum, id_user, comment_content, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const insertCommentResult = await client.query(insertCommentQuery, [
        id_forum,
        id_user,
        comment_content,
        created_at,
      ]);

      const insertedComment = insertCommentResult.rows[0];

      // If the comment is added successfully, return the inserted comment
      res.status(201).json({ message: "Comment added successfully", comment: insertedComment });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

export {
  createForum,
  getForums,
  getForumById,
  updateForumById,
  deleteUserById,
  createCommentForum,
};
