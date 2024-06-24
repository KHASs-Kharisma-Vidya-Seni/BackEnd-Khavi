import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pathJoin from "../utility/dirname.js";
import pool from "../lib/db-neon.js";

import { v4 as uuidv4 } from "uuid";
import { sendTokenVerificationEmail } from "../helper/nodemailer.js";

const authRegister = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  const uid = uuidv4(); // Generate UUID for user

  if (!username || !email || !password) {
    return res.status(400).send("Username, email, and password are required");
  }

  const client = await pool.connect();
  try {
    // Check if email already exists
    const checkEmailQuery = 'SELECT email FROM "users" WHERE email = $1';
    const { rows: existingUsers } = await client.query(checkEmailQuery, [email]);

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const salted = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salted);

    // Token verifikasi unik dengan kadaluarsa 5 menit
    const verificationToken = jwt.sign({ email }, process.env.JWT_RESET_PASSWORD_SECRET, {
      expiresIn: "5m",
    });

    const insertUserQuery = `
      INSERT INTO "users" (uid, username, email, password, verified, verification_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING uid, username
    `;
    const newUser = [uid, username, email, hashedPassword, false, verificationToken];

    const { rows: newUserReg } = await client.query(insertUserQuery, newUser);

    // Kirim email verifikasi
    sendTokenVerificationEmail(email, verificationToken);

    console.log("User created successfully");
    console.log(newUserReg);

    return res.status(201).json({ message: "User registered successfully", newUserReg });
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ error: "Error registering user" });
  } finally {
    client.release();
  }
});

const authLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM "users" WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.status(400).json({ error: "Email not found" });
      }

      const currentUser = result.rows[0];
      const checkPassword = bcrypt.compareSync(password, currentUser.password);

      if (!checkPassword) {
        return res.status(400).json({ error: "Email or password is incorrect" });
      }

      if (!currentUser.verified) {
        return res.status(401).json({ error: "Please verify your email before logging in" });
      }

      const jwtToken = jwt.sign({ id: currentUser.uid }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      const { password: omitPassword, verification_token, verified, ...userData } = currentUser;

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
        .json(userData);

      console.log("User logged in successfully");
      console.log(userData);
    } finally {
      client.release();
    }
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
    .send("user logged out");
});

const authVerify = asyncHandler(async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.JWT_RESET_PASSWORD_SECRET);
    const email = decoded.email;

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM "users" WHERE email = $1 AND verification_token = $2',
        [email, token], // Pastikan token yang di-pass sesuai dengan UUID
      );

      console.log(result.rows);

      if (result.rows.length === 0) {
        return res.status(401).send("Invalid or expired verification token");
      }

      const user = result.rows[0];

      const updateResult = await client.query(
        'UPDATE "users" SET verified = $1, verification_token = $2 WHERE uid = $3',
        [true, null, user.uid],
      );

      if (updateResult.rowCount === 0) {
        return res.status(500).send("Error updating user");
      }

      res.status(200).sendFile(pathJoin("verification_success.html"));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error verifying token:", err.message);
    res.status(401).send("Invalid or expired verification token");
  }
});

export { authRegister, authLogin, authLogout, authVerify };
