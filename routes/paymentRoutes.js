import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    initializePayment,
    handleFlutterwaveWebhook,
    verifyPayment,
    getUserPaymentHistory,
} from '../controllers/paymentController.js';

const router = express.Router();

// Route to initialize payment (requires user authentication)
router.post('/initialize', verifyToken, initializePayment);

// Webhook route for Flutterwave (does NOT require authentication, Flutterwave calls this)
router.post('/webhook/flutterwave', handleFlutterwaveWebhook);

// Route to verify payment
router.get('/verify/:reference', verifyToken, verifyPayment);

// Route to get user's payment history
router.get('/history', verifyToken, getUserPaymentHistory);

export default router;
