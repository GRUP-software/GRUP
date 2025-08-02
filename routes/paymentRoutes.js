import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  initializePayment,
  verifyPayment,
  handlePaystackWebhook,
  confirmManualPayment,
  getPaymentStatus,
} from "../controllers/paymentController.js"

const router = express.Router()

// Initialize Paystack payment
router.post("/initialize", verifyToken, initializePayment)

// Verify Paystack payment
router.get("/verify/:reference", verifyPayment)

// Paystack webhook (no auth needed)
router.post("/webhook/paystack", handlePaystackWebhook)

// Manual payment confirmation (like Remita)
router.post("/confirm-manual", verifyToken, confirmManualPayment)

// Get payment status
router.get("/status/:orderId", verifyToken, getPaymentStatus)

export default router
