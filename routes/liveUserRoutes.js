import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  updateUserActivity,
  getLiveUserCount,
} from "../controllers/liveUserController.js";

const router = express.Router();

router.post("/activity", verifyToken, updateUserActivity);
router.get("/count", getLiveUserCount);

export default router;
