import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  getUserOrders,
  getOrderProgress,
  getOrdersForAdmin,
  updateOrderStatus,
} from "../controllers/orderController.js"

const router = express.Router()

router.post("/", verifyToken)
router.get("/my-orders", verifyToken, getUserOrders)
router.get("/progress/:orderId", verifyToken, getOrderProgress)

// Admin routes
router.get("/admin/all", verifyToken, getOrdersForAdmin)
router.put("/admin/:orderId/status", verifyToken, updateOrderStatus)

export default router
