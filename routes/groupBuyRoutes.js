import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  getActiveGroupBuys,
  getUserGroupBuys,
  getUserGroupBuyStats,
  getManualReviewGroupBuys,
  getGroupBuyStats,
  getGroupBuyByProduct,
  getAllGroupBuys,
  getGroupBuyById,
  getGroupBuyStatus,
  reviewGroupBuy,
  updateGroupBuyMVU,
} from "../controllers/groupBuyController.js"

const router = express.Router()

// Specific routes MUST come before dynamic routes
// Get all active group buys
router.get("/active", getActiveGroupBuys)

// Get all group buys with filtering (admin)
router.get("/all", getAllGroupBuys)

// Get user's group buy participations
router.get("/my-groups", verifyToken, getUserGroupBuys)

// Get user's group buy statistics
router.get("/my-stats", verifyToken, getUserGroupBuyStats)

// Get group buy statistics
router.get("/stats", getGroupBuyStats)

// Get group buys needing manual review (admin)
router.get("/manual-review", verifyToken, getManualReviewGroupBuys)

// Get group buy for specific product
router.get("/product/:productId", getGroupBuyByProduct)

// Get group buy status for specific product
router.get("/group-status/:productId", getGroupBuyStatus)



// Get single group buy by ID (MUST be after specific routes)
router.get("/:id", getGroupBuyById)

// Admin routes
router.post("/:id/review", verifyToken, reviewGroupBuy)
router.patch("/:id/mvu", verifyToken, updateGroupBuyMVU)

export default router
