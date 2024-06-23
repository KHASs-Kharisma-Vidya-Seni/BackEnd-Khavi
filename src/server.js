import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import MemoryStore from "memorystore";

import userRouter from "./routes/user.js";
import authRouter from "./routes/auth.js";
import forumRouter from "./routes/forum.js";
import commentRouter from "./routes/comment.js";
import verifyTokenJWT from "./middlewares/verify-token.js";
import pathJoin from "./utility/dirname.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const MemoryStoreSession = MemoryStore(session);

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:8080",
  credentials: true,
};

const sessionOptions = {
  store: new MemoryStoreSession({
    checkPeriod: 3600, // prune expired entries every 1h
  }),
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
};

// middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(session(sessionOptions));
app.use(morgan("dev"));

app.use(express.static("public"));

// routes
app.get("/", (req, res) => {
  res.status(200).sendFile(pathJoin("verification_success.html"));
});

app.use("/api/users", verifyTokenJWT, userRouter);
app.use("/api/auth", authRouter);
app.use("/api/forum", verifyTokenJWT, forumRouter);
app.use("/api/comment", verifyTokenJWT, commentRouter);

app.get("/api/current-user", verifyTokenJWT, (req, res) => {
  // Kirim data pengguna saat ini sebagai respons
  console.log(req.user);
  res.json(req.user);
});

// listen
app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
