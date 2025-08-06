import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  getActiveGroupBuys,
  getGroupBuyByProduct,
  getUserGroupBuys,
  getGroupBuyStats,
  getManualReviewGroupBuys,
  updateGroupBuyStatus,
} from "../controllers/groupBuyController.js"

const router = express.Router()

// Public routes
router.get("/active", getActiveGroupBuys)
router.get("/product/:productId", getGroupBuyByProduct)

// Protected routes
router.get("/my-groups", verifyToken, getUserGroupBuys)

// Admin routes
router.get("/stats", verifyToken, getGroupBuyStats)
router.get("/manual-review", verifyToken, getManualReviewGroupBuys)
router.patch("/:groupBuyId/status", verifyToken, updateGroupBuyStatus)

export default router
