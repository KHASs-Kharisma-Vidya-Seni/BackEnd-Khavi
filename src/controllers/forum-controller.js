import asyncHandler from "express-async-handler";

const getForum = asyncHandler(async (req, res) => {
  try {
    const { data: forum, error: errorForum } = await supabase
      .from("forum")
      .select("id_forum, content, image, created_at, id_user, user(uid,username, email)");

    if (errorForum) return res.status(404).json({ message: "Maaf, terjadi kesalahan" });

    return res.status(200).json(forum);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});
