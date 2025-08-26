import express from "express"
import { handlePaystackWebhook, handleWebhook } from "../controllers/webhookController.js"
import { handleWhatsAppWebhook, verifyWhatsAppWebhook, testWebhook } from "../controllers/whatsappController.js"

const router = express.Router()

// Test endpoint
router.get("/test", testWebhook)

// Paystack webhook endpoint
router.post("/paystack", handlePaystackWebhook)

// WhatsApp webhook endpoints
router.get("/whatsapp", verifyWhatsAppWebhook)
router.post("/whatsapp", handleWhatsAppWebhook)

// Generic webhook endpoint
router.post("/generic", handleWebhook)

// Legacy webhook endpoint for backward compatibility
router.post("/", handleWebhook)

export default router
