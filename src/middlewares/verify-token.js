import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import pool from "../lib/db-neon.js";

const verifyTokenJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken || req.header("auth-token");
  console.log(token)
  if (!token) {
    return res.status(401).json({ error: "Access Denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT uid, username, email, photo_url, location FROM "users" WHERE uid = $1',
        [decoded.id],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid token or user not found" });
      }

      const user = result.rows[0];

      req.user = user;

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
});

export default verifyTokenJWT;
