import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pathJoin from "../utility/dirname.js";
import { supabase } from "../helper/supabaseClient.js";
import { sendTokenVerificationEmail } from "../helper/nodemailer.js";

const authRegister = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("Username, email, and password are required");
  }

  try {
    // Cek apakah email sudah terdaftar sebelumnya
    const { data: existingUsers, error: existingUsersError } = await supabase
      .from("user")
      .select("email")
      .eq("email", email);

    if (existingUsersError) {
      return res.status(500).json({ error: existingUsersError.message });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const salted = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salted);

    // Token verifikasi unik dengan kadaluarsa 5 menit
    const verificationToken = jwt.sign({ email }, process.env.JWT_RESET_PASSWORD_SECRET, {
      expiresIn: "5m",
    });

    const newUser = {
      username,
      email,
      password: hashedPassword,
      verified: false,
      verificationToken,
    };

    // Simpan data pengguna ke dalam tabel user
    const { data: userData, error: dbError } = await supabase.from("user").insert(newUser);

    if (dbError) {
      return res.status(500).json({ error: "Error registering user" });
    }

    // Kirim email verifikasi
    sendTokenVerificationEmail(email, verificationToken);

    const { data: newUserReg } = await supabase
      .from("user")
      .select("uid, username")
      .eq("email", email);

    console.log("User created successfully");
    console.log(newUser);

    return res.status(201).json({ message: "User registered successfully", newUserReg });
    // .send(
    //   "User registered successfully, please check your email for verification",
    // );
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

const authLogin = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const { data: users, error: usersError } = await supabase
      .from("user")
      .select("*")
      .eq("email", email);

    if (usersError) throw usersError;
    if (users.length === 0) return res.status(400).json({ error: "Email not found" });

    const currentUser = users[0];
    const checkPassword = bcrypt.compareSync(req.body.password, currentUser.password);

    if (!checkPassword) return res.status(400).json({ error: "Email or Password is incorrect" });

    if (!currentUser.verified) {
      res.status(401).send("Please verify your email before logging in");
    }

    const jwtToken = jwt.sign({ id: currentUser.uid }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const { password, verificationToken, verified, ...other } = currentUser;

    res
      .cookie("accessToken", jwtToken, {
        httpOnly: true,
        path: "/",
        secure: true,
        sameSite: "none",
        expires: new Date(Date.now() + 60 * 60 * 1000),
      })
      .header("auth-token", jwtToken)
      .status(200)
      .json({ ...other });

    console.log("User logged in successfully");
    console.log(req.body);
    console.log(jwtToken);
    console.log(other);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const authLogout = asyncHandler(async (req, res) => {
  res
    .clearCookie("accessToken", {
      secure: true,
      sameSite: "none",
    })
    .status(200)
    .send("user logged out")
});

const authVerify = asyncHandler(async (req, res) => {
  const { token } = req.params;
  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_PASSWORD_SECRET);
    const email = decoded.email;

    const { data, error } = await supabase
      .from("user")
      .select("*")
      .eq("email", email)
      .eq("verificationToken", token);

    if (error || data.length === 0) {
      res.status(401).send("Invalid or expired verification token");
    } else {
      const user = data[0];
      const { error: updateError } = await supabase
        .from("user")
        .update({ verified: true, verificationToken: null })
        .eq("uid", user.uid);

      if (updateError) {
        res.status(500).send("Error updating user");
      } else {
        res.status(200).sendFile(pathJoin("verification_success.html"));
      }
    }
  } catch (err) {
    res.status(401).send("Invalid or expired verification token");
  }
});

export { authRegister, authLogin, authLogout, authVerify };
