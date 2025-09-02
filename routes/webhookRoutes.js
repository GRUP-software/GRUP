import express from "express";
import { handleFlutterwaveWebhook } from "../controllers/webhookController.js";
import {
  handleWhatsAppWebhook,
  verifyWhatsAppWebhook,
  testWebhook,
} from "../controllers/whatsappController.js";

const router = express.Router();

// Test endpoint
router.get("/test", testWebhook);

// Flutterwave webhook endpoint
router.post("/flutterwave", handleFlutterwaveWebhook);

// WhatsApp webhook endpoints
router.get("/whatsapp", verifyWhatsAppWebhook);
router.post("/whatsapp", handleWhatsAppWebhook);

export default router;
