import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  initializePayment,
  handlePaystackWebhook,
} from "../controllers/paymentController.js";

const router = express.Router();


router.post("/initialize", verifyToken, initializePayment);


router.post("/webhook/paystack", handlePaystackWebhook);

export default router;
