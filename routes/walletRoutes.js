import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  getWalletData,
  calculateWalletOffset,
  getTransactionHistory,
  invalidateCache,
} from "../controllers/walletController.js";

const router = express.Router();

// Get wallet data
router.get("/", verifyToken, getWalletData);

// Calculate wallet offset for checkout
router.post("/calculate-offset", verifyToken, calculateWalletOffset);

// Get transaction history with filters
router.get("/transactions", verifyToken, getTransactionHistory);

// Invalidate wallet cache (for admin/debug purposes)
router.post("/invalidate-cache", verifyToken, invalidateCache);

export default router;
