import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { supabase } from "../helper/supabaseClient.js";

const verifyTokenJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken || req.header("auth-token");

  // console.log({
  //   token: token,
  //   cookies: req.cookies.accessToken,
  //   headers: req.headers,
  // });

  if (!token) {
    return res.status(401).json({ error: "Access Denied" });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from("user")
      .select("uid, username, email, photoURL")
      .eq("uid", decoded.id)
      .single();

    // console.log(decoded);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token or user not found" });
    }

    req.user = user;

    // console.log("User: ", req.user);

    next();
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
});

export default verifyTokenJWT;
