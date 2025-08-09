import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  getUserOrders,
  getOrderProgress,
  trackOrderByNumber,
  lookupOrderForStaff,
  getOrdersForAdmin,
  updateOrderStatus,
  handleFulfillmentChoice,
} from "../controllers/orderController.js"

const router = express.Router()

// Customer routes
router.get("/my-orders", verifyToken, getUserOrders)
router.get("/progress/:orderId", verifyToken, getOrderProgress)

// Public tracking route (no auth required)
router.get("/track/:trackingNumber", trackOrderByNumber)

// Staff routes (requires auth)
router.get("/lookup/:trackingNumber", verifyToken, lookupOrderForStaff)

// Admin routes
router.get("/admin/all", verifyToken, getOrdersForAdmin)
router.patch("/admin/:trackingNumber/status", verifyToken, updateOrderStatus)

// WhatsApp integration
router.post("/fulfillment-choice", handleFulfillmentChoice)

export default router
