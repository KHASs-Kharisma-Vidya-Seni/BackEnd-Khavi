import { Router } from "express";
import { getUserById, getUsers, getUsersWithForums } from "../controllers/user-controller.js";
import { supabase, supabaseBucket } from "../helper/supabaseClient.js";
import { fetchUserById } from "../services/user-service.js";
import upload from "../helper/multer.js";

const router = Router();

router.get("/", getUsers);
router.get("/forum", getUsersWithForums);
router.get("/:id", getUserById);
router.patch("/:id", upload.single("image"), async (req, res) => {
  try {
    const { username } = req.body;
    const image = req.file;
    // const id = req.params.id;
    // const { uid } = req.user;

    const { id } = req.params; // id dari parameter URL
    const uid = req.user.uid;

    console.log("User ID: ", uid);
    console.log("Params ID: ", id);
    console.log("User: ", req.user);

    // Pastikan uid dari req.user sama dengan id dari req.params
    if (uid !== id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // console.log("User ID: ", uid);
    // if (uploadError) throw uploadError;

    if (!uid) return res.status(400).json({ error: "User ID is required." });

    const { data: user, error: userError } = await supabase
      .from("user")
      .select("uid, username, photoURL")
      .eq("uid", uid)
      .single();

    console.log(user);

    if (userError) return res.status(404).json({ error: "User not found." });

    // Memeriksa apakah pengguna adalaaaah pengguna yang sedang login
    if (user.uid !== uid) return res.status(403).json({ error: "Unauthorized." });

    let imageUrl = user.photoURL;

    // Menghapus gambar lama dari penyimpanan Supabase jika ada dan Mengunggah gambar baru jika ada
    if (image) {
      const { data: oldForumData, error: oldForumError } = await supabase
        .from("user")
        .select("photoURL")
        .eq("uid", uid)
        .single();

      if (oldForumError) throw oldForumError;

      let oldImageUrl = null;

      if (oldForumData && oldForumData.photoURL) {
        oldImageUrl = oldForumData.photoURL;

        // Menghapus gambar lama dari Supabase Storage
        const fileName = oldImageUrl.split("/").pop();
        const { data: deleteData, error: deleteError } = await supabaseBucket.remove(
          `profile/${fileName}`,
        );

        if (deleteError) throw deleteError;
      }

      // Mengunggah gambar baru ke penyimpanan Supabase
      const { data: uploadData, error: uploadError } = await supabaseBucket.upload(
        `profile/${image.originalname}`,
        image.buffer,
        {
          contentType: image.mimetype,
        },
      );

      if (uploadError) throw uploadError;

      imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/profile/${image.originalname}`;
    }

    // Update user

    const { data: updatedUser, error: updateError } = await supabase
      .from("user")
      .update({
        username,
        photoURL: imageUrl,
      })
      .eq("uid", uid)
      .single();

    if (updateError) throw updateError;

    res.status(200).json({ message: "User updated successfully.", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user." });
  }
});

export default router;
