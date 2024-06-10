import { Router } from "express";
import {
  authLogin,
  authLogout,
  authRegister,
  authVerify,
} from "../controllers/auth-controller.js";
import { supabase } from "../helper/supabaseClient.js";

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
    const { data, error } = await supabase
      .from("user")
      .select("verified")
      .eq("uid", id)
      .single();

    if (error) {
      console.error("Error fetching verification status:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Jika data ditemukan, kembalikan status verifikasi
    if (data) {
      return res.json({ verified: data.verified });
    }

    // Jika data tidak ditemukan, kembalikan 404 Not Found
    return res.status(404).json({ error: "User not found" });
  } catch (error) {
    console.error("Error checking verification status:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
