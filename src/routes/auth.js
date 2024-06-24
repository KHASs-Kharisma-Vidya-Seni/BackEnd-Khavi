import { Router } from "express";
import { authLogin, authLogout, authRegister, authVerify } from "../controllers/auth-controller.js";
import pool from "../lib/db-neon.js";

const router = Router();

router.post("/register", authRegister);
router.post("/login", authLogin);
router.get("/logout", authLogout);
router.get("/verify/:token", authVerify);

router.get("/verify/status/:id", async (req, res) => {
  try {
    // Ambil ID pengguna dari parameter URL
    const { id } = req.params;

    // Lakukan query untuk mendapatkan status verifikasi berdasarkan ID pengguna
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT verified FROM "users" WHERE uid = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Jika data ditemukan, kembalikan status verifikasi
      const { verified } = result.rows[0];
      return res.json({ verified });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error checking verification status:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
