import { Router } from "express";
import { supabase, supabaseBucket } from "../helper/supabaseClient.js";
import upload from "../helper/multer.js";
import configureEnvSelf from "../utility/dote-env.js";
import { getForumWithComments } from "../services/forum-service.js";
import moment from "moment";

configureEnvSelf();

const router = Router();

router.get("/", async (req, res) => {
  const { withUser } = req.query;
  try {
    // const { data: forum, error: errorForum } = await supabase
    //   .from("forum")
    //   .select("id_forum, content, image, created_at, id_user, user(uid,username, email)");

    // if (errorForum) return res.status(404).json({ message: "Maaf, terjadi kesalahan" });

    const forumCommentsWithUsers = await getForumWithComments(withUser === "true");
    res.json(forumCommentsWithUsers);

    // return res.status(200).json(forum);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  console.log(req.user);
  try {
    const { content } = req.body;
    const image = req.file;

    const { uid } = req.user;
    const id_user = uid;

    // console.log("User ID: ", id_user);

    // console.log("Content: ", content);
    // console.log("Image: ", image);

    // Upload gambar ke Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseBucket.upload(
      `images/${image.originalname}`,
      image.buffer,
      {
        contentType: image.mimetype,
      },
    );

    if (uploadError) throw uploadError;

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/images/${image.originalname}`;

    const createAtLocal = moment().format();

    // Simpan data forum ke database
    const { data: forum, error: forumError } = await supabase
      .from("forum")
      .insert({
        content,
        image: imageUrl,
        id_user,
        created_at: createAtLocal,
        update_at: createAtLocal,
      });

    if (forumError) throw forumError;

    return res.status(201).json({
      message: "Forum berhasil dibuat",
    });

    // res.status(303).redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", error });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: forum, error: forumError } = await supabase
      .from("forum")
      .select("id_forum, content, image, created_at, id_user, user(uid,username, email)")
      .eq("id_forum", id)
      .single();

    if (forumError) return res.status(404).json({ message: "Forum tidak ditemukan" });

    return res.status(200).json(forum);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", error });
  }
});

router.patch("/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const image = req.file;

    // Mendapatkan informasi pengguna dari token akses
    const { uid } = req.user;
    const userId = uid;

    // const userId = id_user;
    //id_user;

    // cek apakah user menrupakkan pemilik forum

    if (!userId)
      return res.status(403).json({ message: "Anda tidak diizinkan mengupdate forum ini" });

    // Mengambil informasi forum dari database
    const { data: forumData, error: forumError } = await supabase
      .from("forum")
      .select("id_user, image, content")
      .eq("id_forum", id)
      .single();

    if (forumError) throw forumError;
    if (!forumData) return res.status(404).json({ message: "Forum tidak ditemukan" });

    // Memeriksa apakah pengguna adalah pemilik forum
    if (forumData.id_user !== userId) {
      return res.status(403).json({ message: "Anda tidak diizinkan mengupdate forum ini" });
    }

    let imageUrl = forumData.image;

    // Menghapus gambar lama dari penyimpanan Supabase jika ada dan Mengunggah gambar baru jika ada
    if (image) {
      const { data: oldForumData, error: oldForumError } = await supabase
        .from("forum")
        .select("image")
        .eq("id_forum", id)
        .single();

      if (oldForumError) throw oldForumError;

      let oldImageUrl = null;

      if (oldForumData && oldForumData.image) {
        oldImageUrl = oldForumData.image;

        // Menghapus gambar lama dari Supabase Storage
        const fileName = oldImageUrl.split("/").pop();
        const { data: deleteData, error: deleteError } = await supabaseBucket.remove(
          `images/${fileName}`,
        );

        if (deleteError) throw deleteError;
      }

      // Mengunggah gambar baru
      const { data: uploadData, error: uploadError } = await supabaseBucket.upload(
        `images/${image.originalname}`,
        image.buffer,
        { contentType: image.mimetype },
      );

      if (uploadError) throw uploadError;

      imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/images/${image.originalname}`;
    }

    const updateAtLocal = moment().format();

    // Memperbarui forum
    const { data: updatedForum, error: updateError } = await supabase
      .from("forum")
      .update({ content, image: imageUrl, update_at: updateAtLocal })
      .eq("id_forum", id);

    if (updateError) throw updateError;

    return res.status(200).json({
      message: "Forum berhasil diupdate",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", error });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Mendapatkan informasi pengguna dari token akses
    const { uid } = req.user;

    // Mengambil informasi forum dari database
    const { data: forumData, error: forumError } = await supabase
      .from("forum")
      .select("id_user, image")
      .eq("id_forum", id)
      .single();

    if (forumError) throw forumError;
    if (!forumData) return res.status(404).json({ message: "Forum tidak ditemukan" });

    console.log(uid, forumData.id_user);

    // Memeriksa apakah pengguna adalah pemilik forum
    if (forumData.id_user !== uid) {
      return res.status(403).json({
        message: "Anda tidak diizinkan menghapus forum ini",
        userId,
        forumData,
      });
    }

    // Menghapus gambar dari penyimpanan Supabase jika ada
    if (forumData.image) {
      const fileName = forumData.image.split("/").pop();
      const { data: deleteData, error: deleteError } = await supabaseBucket.remove(
        `images/${fileName}`,
      );

      if (deleteError) throw deleteError;
    }

    // Menghapus forum dari tabel
    const { error: deleteForumError } = await supabase.from("forum").delete().eq("id_forum", id);

    if (deleteForumError) throw deleteForumError;

    return res.status(200).json({ message: "Forum berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", error });
  }
});

router.post("/:id_forum/comments", async (req, res) => {
  const { id_forum } = req.params;
  const { id_user, comment_content } = req.body;

  try {
    // Check if required fields are provided
    if (!id_user || !comment_content) {
      return res.status(400).json({ error: "id_user and comment_content are required" });
    }

    // Insert the comment into the database
    const { data, error } = await supabase.from("comments").insert({
      id_forum: id_forum,
      id_user: id_user,
      comment_content,
    });

    if (error) {
      console.error("Error adding comment:", error);
      return res.status(500).json({ error: "Failed to add comment" });
    }

    // If the comment is added successfully, return the inserted comment
    res.status(201).json({ message: "Comment added successfully", comment: data });
  } catch (error) {
    console.error("Error adding comment:", error.message);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// router.get("/withcomments", async (req, res) => {
//   const { withUser } = req.query;
//   // Mengambil parameter query string 'withUser'
//   try {
//     const forumCommentsWithUsers = await getForumWithComments(withUser === "true");
//     res.json(forumCommentsWithUsers);
//   } catch (error) {
//     console.error("Error fetching forums:", error.message);
//     res.status(500).json({ error: "Failed to fetch forums" });
//   }
// });

export default router;
