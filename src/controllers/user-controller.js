import asyncHandler from "express-async-handler";
import getErrorMessage from "../helper/erorr-message.js";

import { fetchAllForums, fetchAllUsers, fetchUserById } from "../services/user-service.js";
import { supabase, supabaseBucket } from "../helper/supabaseClient.js";

export const getUsers = asyncHandler(async (req, res) => {
  try {
    const { users, error: UserError } = await fetchAllUsers();

    if (UserError) throw UserError;

    if (!users) return res.status(404).json({ message: "No users found" });

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export const getUsersWithForums = asyncHandler(async (req, res) => {
  try {
    // Mengambil semua pengguna
    const { users, error: usersError } = await fetchAllUsers();
    // Mengambil semua forum
    const { forums, error: forumsError } = await fetchAllForums();

    // Tangani error saat mengambil data pengguna atau forum
    if (usersError) {
      console.error("Error mengambil data pengguna:", usersError);
      return res.status(500).json(getErrorMessage(usersError));
    }

    if (forumsError) {
      console.error("Error mengambil data forum:", forumsError);
      return res.status(500).json(getErrorMessage(forumsError));
    }

    // Gabungkan pengguna dengan forum mereka
    const usersWithForums = users.map(user => {
      const userForums = forums.filter(forum => forum.id_user === user.uid);
      return { ...user, forums: userForums };
    });

    res.json(usersWithForums);
  } catch (error) {
    console.error(getErrorMessage(error));
    res.status(500).json(getErrorMessage(error));
  }
});

export const getUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params; // Mengambil parameter 'id' dari URL

    const { user, error: userError } = await fetchUserById(id); // Memanggil fungsi fetchUserById untuk mendapatkan user berdasarkan ID

    if (userError) {
      // Jika terdapat error saat mengambil user, kembalikan respon 400 dengan pesan error yang jelas
      return res.status(400).json({ error: `Error fetching user: ${userError.message}` });
    }

    if (!user) {
      // Jika user tidak ditemukan, kembalikan respon 404 dengan pesan "User not found"
      return res.status(404).json({ message: "User not found" });
    }

    // Jika user ditemukan, kembalikan data user dengan respon 200
    return res.status(200).json(user);
  } catch (error) {
    // Jika terjadi kesalahan di luar pengambilan user, kembalikan respon 500 dengan pesan error
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const { username } = req.body;
    const image = req.file;

    const { id } = req.params; // ID pengguna dari parameter URL
    const uid = req.user.uid; // UID pengguna saat ini dari autentikasi

    // console.log(req.user);

    // Pastikan UID dari req.user cocok dengan ID dari req.params
    if (uid !== id) {
      return res.status(403).json({ error: "Akses tidak diizinkan. ID pengguna tidak cocok." });
    }

    // Validasi UID pengguna
    if (!uid) {
      return res
        .status(400)
        .json({ error: "ID pengguna diperlukan untuk melakukan tindakan ini." });
    }

    // Ambil data pengguna dari Supabase
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("uid, username, photoURL")
      .eq("uid", uid)
      .single();

    // Tangani error saat mengambil data pengguna
    if (userError) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    // Periksa apakah pengguna yang diambil adalah pengguna yang sedang login
    if (user.uid !== uid) {
      return res.status(403).json({ error: "Akses tidak diizinkan." });
    }

    let imageUrl = user.photoURL; // Inisialisasi imageUrl dengan photoURL saat ini

    // Tangani upload gambar (jika gambar disediakan)
    if (image) {
      // Ambil data gambar lama
      const { data: oldUserData, error: oldUserError } = await supabase
        .from("user")
        .select("photoURL")
        .eq("uid", uid)
        .single();

      // Tangani error saat mengambil data gambar lama
      if (oldUserError) {
        console.error("Error mengambil data pengguna lama:", oldUserError);
        return res.status(500).json({ error: "Gagal mengambil data pengguna lama." });
      }

      let oldImageUrl = null;

      // Jika ada photoURL yang ada, hapus gambar lama dari Penyimpanan Supabase
      if (oldUserData && oldUserData.photoURL) {
        oldImageUrl = oldUserData.photoURL;
        const fileName = oldImageUrl.split("/").pop(); // Ambil nama file dari URL

        // Hapus gambar lama dari Penyimpanan Supabase
        const { data: deleteData, error: deleteError } = await supabaseBucket.remove(
          `profile/${fileName}`,
        );

        // Tangani error saat menghapus gambar lama
        if (deleteError) {
          console.error("Error menghapus gambar lama:", deleteError);
          return res.status(500).json({ error: "Gagal menghapus gambar lama." });
        }
      }

      // Upload gambar baru ke Penyimpanan Supabase
      const { data: uploadData, error: uploadError } = await supabaseBucket.upload(
        `profile/${image.originalname}`,
        image.buffer,
        {
          contentType: image.mimetype,
        },
      );

      // Tangani error saat mengunggah gambar baru
      if (uploadError) {
        console.error("Error mengunggah gambar baru:", uploadError);
        return res.status(500).json({ error: "Gagal mengunggah gambar baru." });
      }

      // Buat imageUrl dengan URL gambar yang baru diunggah
      imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/profile/${image.originalname}`;
    }

    // Perbarui data pengguna di database Supabase
    const { data: updatedUser, error: updateError } = await supabase
      .from("user")
      .update({
        username,
        photoURL: imageUrl,
      })
      .eq("uid", uid)
      .single();

    // Tangani error saat memperbarui data pengguna
    if (updateError) {
      console.error("Error memperbarui data pengguna:", updateError);
      return res.status(500).json({ error: "Gagal memperbarui data pengguna." });
    }

    // Berikan respon dengan pesan sukses dan data pengguna yang diperbarui
    res.status(200).json({ message: "Pengguna berhasil diperbarui.", user: updatedUser });
  } catch (error) {
    // Catat error untuk keperluan debugging
    console.error("Error memperbarui pengguna:", error);

    // Berikan respon dengan pesan error yang sesuai
    res.status(500).json({ error: "Gagal memperbarui pengguna. Silakan coba lagi nanti." });
  }
});

export const deleteUser = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params; // id dari pengguna yang akan dihapus
    const userLogin = req.user.uid; // pengguna yang sedang login.

    console.log(id, userLogin);

    // Mendapatkan informasi pengguna dari database
    const { user, error } = await fetchUserById(id);

    // Memeriksa apakah pengguna ditemukan
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Memeriksa apakah ada error saat mengambil data pengguna
    if (error) {
      return res.status(400).json({ message: "Error fetching user" });
    }

    // Memeriksa apakah pengguna yang mengirim permintaan adalah pengguna yang akan dihapus
    // if (userLogin !== user.uid) {
    //   return res.status(403).json({ error: "You are not authorized to delete this user" });
    // }

    // Menghapus user dari database Supabase
    const { data, deleteError } = await supabase.from("user").delete().eq("uid", user.uid);

    // Memeriksa apakah ada error saat menghapus pengguna
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message, message: "Error deleting user" });
    }

    // Mengembalikan respons berhasil jika pengguna berhasil dihapus
    return res.status(200).json({ message: "User deleted successfully", user: id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message, message: "Error deleting user" });
  }
});
