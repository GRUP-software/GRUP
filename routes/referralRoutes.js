import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { 
  getReferralInfo, 
  getReferralStats, 
  validateReferralCode
} from '../controllers/referralController.js';

const router = express.Router();

// Get user's referral information
router.get('/info', verifyToken, getReferralInfo);

// Get referral statistics
router.get('/stats', verifyToken, getReferralStats);

// Validate referral code (public endpoint)
router.get('/validate/:referralCode', validateReferralCode);



export default router;
