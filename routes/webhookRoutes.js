import express from "express"
import { handlePaystackWebhook, handleWebhook } from "../controllers/webhookController.js"

const router = express.Router()

// Paystack specific webhook
router.post("/paystack", handlePaystackWebhook)

// Generic webhook handler
router.post("/", handleWebhook)

export default router
