import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import { getWalletData } from "../controllers/walletController.js"

const router = express.Router()

router.get("/", verifyToken, getWalletData)

export default router
