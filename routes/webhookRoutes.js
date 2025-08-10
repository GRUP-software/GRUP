import express from "express"
import { handlePaystackWebhook, handleWebhook } from "../controllers/webhookController.js"

const router = express.Router()

// Paystack webhook endpoint
router.post("/paystack", handlePaystackWebhook)

// Generic webhook endpoint
router.post("/generic", handleWebhook)

// Legacy webhook endpoint for backward compatibility
router.post("/", handleWebhook)

export default router
