import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js" // Assuming verifyToken is protect
import { initializePayment, handlePaystackWebhook } from "../controllers/paymentController.js"

const router = express.Router()

// Route to initialize payment (requires user authentication)
router.post("/initialize", verifyToken, initializePayment)

// Webhook route for Paystack (does NOT require authentication, Paystack calls this)
router.post("/webhook/paystack", handlePaystackWebhook)

export default router
