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

// Debug endpoint to check database state
router.get("/debug", async (req, res) => {
  try {
    const GroupBuy = (await import("../models/GroupBuy.js")).default
    const PaymentHistory = (await import("../models/PaymentHistory.js")).default
    const Order = (await import("../models/order.js")).default

    const groupBuysCount = await GroupBuy.countDocuments()
    const paymentHistoriesCount = await PaymentHistory.countDocuments()
    const ordersCount = await Order.countDocuments()

    const recentGroupBuys = await GroupBuy.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("productId", "title price")

    const recentPaymentHistories = await PaymentHistory.find({}).sort({ createdAt: -1 }).limit(5)

    const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5)

    res.json({
      success: true,
      debug: {
        groupBuysCount,
        paymentHistoriesCount,
        ordersCount,
        recentGroupBuys,
        recentPaymentHistories,
        recentOrders,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Debug query failed",
      error: error.message,
    })
  }
})

// Get single group buy by ID (MUST be after specific routes)
router.get("/:id", getGroupBuyById)

// Admin routes
router.post("/:id/review", verifyToken, reviewGroupBuy)
router.patch("/:id/mvu", verifyToken, updateGroupBuyMVU)

export default router
