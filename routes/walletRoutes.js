import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import { getWalletData, calculateWalletOffset } from "../controllers/walletController.js"

const router = express.Router()

// Get wallet data
router.get("/", verifyToken, getWalletData)

// Calculate wallet offset for checkout
router.post("/calculate-offset", verifyToken, calculateWalletOffset)

export default router
