import { Router } from "express";
const router = Router();

router.get("/", async (req, res) => {
    res.send("Hello Comment 🚀");
});

export default router;
