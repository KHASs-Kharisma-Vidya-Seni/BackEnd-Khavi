import asyncHandler from "express-async-handler";
import getErrorMessage from "../helper/erorr-message.js";
import pool from "../lib/db-neon.js";

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

// export const updateUserProfile = asyncHandler(async (req, res) => {
//   const { username } = req.body;
//   const image = req.file;

//   const { id } = req.params; // ID pengguna dari parameter URL
//   const uid = req.user.uid; // UID pengguna saat ini dari autentikasi

//   const timestamp = Date.now();
//   const urlName = timestamp + "-" + image.originalname;

//   try {
//     // Pastikan UID dari req.user cocok dengan ID dari req.params
//     if (uid !== id) {
//       return res.status(403).json({ error: "Akses tidak diizinkan. ID pengguna tidak cocok." });
//     }

//     // Validasi UID pengguna
//     if (!uid) {
//       return res
//         .status(400)
//         .json({ error: "ID pengguna diperlukan untuk melakukan tindakan ini." });
//     }

//     // Ambil data pengguna dari PostgreSQL
//     const client = await pool.connect();
//     try {
//       const query = 'SELECT uid, username, photo_url FROM "users" WHERE uid = $1';
//       const result = await client.query(query, [uid]);

//       if (result.rows.length === 0) {
//         return res.status(404).json({ error: "Pengguna tidak ditemukan." });
//       }

//       const user = result.rows[0];

//       // Periksa apakah pengguna yang diambil adalah pengguna yang sedang login
//       if (user.uid !== uid) {
//         return res.status(403).json({ error: "Akses tidak diizinkan." });
//       }

//       let imageUrl = user.photo_url; // Inisialisasi imageUrl dengan photoURL saat ini

//       // Tangani upload gambar (jika gambar disediakan)
//       if (image) {
//         // Ambil data gambar lama dari Supabase
//         const oldImageUrl = user.photo_url;
//         if (oldImageUrl) {
//           const fileName = oldImageUrl.split("/").pop();

//           // Hapus gambar lama dari Penyimpanan Supabase
//           const { data: deleteData, error: deleteError } = await supabase.storage
//             .from("profile")
//             .remove([fileName]);

//           if (deleteError) {
//             console.error("Error menghapus gambar lama:", deleteError);
//             return res.status(500).json({ error: "Gagal menghapus gambar lama." });
//           }
//         }

//         // Upload gambar baru ke Penyimpanan Supabase
//         const { data: uploadData, error: uploadError } = await supabase.storage
//           .from("profile")
//           .upload(urlName, image.buffer, {
//             contentType: image.mimetype,
//           });

//         if (uploadError) {
//           console.error("Error mengunggah gambar baru:", uploadError);
//           return res.status(500).json({ error: "Gagal mengunggah gambar baru." });
//         }

//         // Buat imageUrl dengan URL gambar yang baru diunggah
//         imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/profile/${urlName}`;
//       }

//       // Perbarui data pengguna di PostgreSQL
//       const updateQuery = `
//         UPDATE "users"
//         SET username = $1, photo_url = $2
//         WHERE uid = $3
//         RETURNING uid, username, photo_url
//       `;
//       const updateValues = [username, imageUrl, uid];
//       const updateResult = await client.query(updateQuery, updateValues);

//       const updatedUser = updateResult.rows[0];

//       // Berikan respon dengan pesan sukses dan data pengguna yang diperbarui
//       res.status(200).json({ message: "Pengguna berhasil diperbarui.", user: updatedUser });
//     } finally {
//       client.release();
//     }
//   } catch (error) {
//     // Catat error untuk keperluan debugging
//     console.error("Error memperbarui pengguna:", error);

//     // Berikan respon dengan pesan error yang sesuai
//     res.status(500).json({ error: "Gagal memperbarui pengguna. Silakan coba lagi nanti." });
//   }
// });

export const updateUserProfile = asyncHandler(async (req, res) => {
  const { username, location } = req.body;
  const image = req.file;

  const { id } = req.params; // ID pengguna dari parameter URL
  const uid = req.user.uid; // UID pengguna saat ini dari autentikasi

  try {
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

    // Ambil data pengguna dari PostgreSQL
    const client = await pool.connect();
    try {
      const query = 'SELECT uid, username, photo_url FROM "users" WHERE uid = $1';
      const result = await client.query(query, [uid]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Pengguna tidak ditemukan." });
      }

      const user = result.rows[0];

      // Periksa apakah pengguna yang diambil adalah pengguna yang sedang login
      if (user.uid !== uid) {
        return res.status(403).json({ error: "Akses tidak diizinkan." });
      }

      let imageUrl = user.photo_url; // Inisialisasi imageUrl dengan photoURL saat ini

      // Tangani upload gambar (jika gambar disediakan)
      if (image) {
        // Ambil data gambar lama dari Supabase
        const oldImageUrl = user.photo_url;
        if (oldImageUrl) {
          const fileName = oldImageUrl.split("/").pop();

          // Hapus gambar lama dari Penyimpanan Supabase
          const { data: deleteData, error: deleteError } = await supabaseBucket.remove(
            `profile/${fileName}`,
          );

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

        if (uploadError) {
          console.error("Error mengunggah gambar baru:", uploadError);
          return res.status(500).json({ error: "Gagal mengunggah gambar baru." });
        }

        // Buat imageUrl dengan URL gambar yang baru diunggah
        imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/profile/${image.originalname}`;
      }

      // Perbarui data pengguna di PostgreSQL
      const updateQuery = `
        UPDATE "users"
        SET username = $1, photo_url = $2, location = $3
        WHERE uid = $4
        RETURNING uid, username, photo_url
      `;
      const updateValues = [username, imageUrl, location, uid];
      const updateResult = await client.query(updateQuery, updateValues);

      const updatedUser = updateResult.rows[0];

      // Berikan respon dengan pesan sukses dan data pengguna yang diperbarui
      res.status(200).json({ message: "Pengguna berhasil diperbarui.", user: updatedUser });
    } finally {
      client.release();
    }
  } catch (error) {
    // Catat error untuk keperluan debugging
    console.error("Error memperbarui pengguna:", error);

    // Berikan respon dengan pesan error yang sesuai
    res.status(500).json({ error: "Gagal memperbarui pengguna. Silakan coba lagi nanti." });
  }
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params; // id dari pengguna yang akan dihapus
  const userLogin = req.user.uid; // pengguna yang sedang login

  console.log("id: ", id, "userLogin: ", userLogin);
  try {
    const client = await pool.connect();
    try {
      // Mendapatkan informasi pengguna dari database PostgreSQL
      const userQuery = 'SELECT uid FROM "users" WHERE uid = $1';
      const userResult = await client.query(userQuery, [id]);

      // Memeriksa apakah pengguna ditemukan
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userResult.rows[0];

      // Memeriksa apakah pengguna yang mengirim permintaan adalah pengguna yang akan dihapus
      // if (userLogin !== user.uid) {
      //   return res.status(403).json({ error: "You are not authorized to delete this user" });
      // }

      // Menghapus semua forum yang terkait dengan pengguna
      const deleteForumQuery = 'DELETE FROM "forum" WHERE id_user = $1';
      await client.query(deleteForumQuery, [id]);

      // Menghapus pengguna dari database PostgreSQL
      const deleteUserQuery = 'DELETE FROM "users" WHERE uid = $1';
      await client.query(deleteUserQuery, [id]);

      // Mengembalikan respons berhasil jika pengguna berhasil dihapus
      return res
        .status(200)
        .json({ message: "User and related forums deleted successfully", user: id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message, message: "Error deleting user" });
  }
});
