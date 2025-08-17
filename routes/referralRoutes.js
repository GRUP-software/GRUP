import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { 
  getReferralInfo, 
  getReferralStats, 
  validateReferralCode,
  triggerReferralBonus,
  forceProcessMissingBonuses,
  processAllMissingBonusesController
} from '../controllers/referralController.js';

const router = express.Router();

// Get user's referral information
router.get('/info', verifyToken, getReferralInfo);

// Get referral statistics
router.get('/stats', verifyToken, getReferralStats);

// Validate referral code (public endpoint)
router.get('/validate/:referralCode', validateReferralCode);

// Manual trigger for referral bonus processing (for debugging)
router.post('/trigger-bonus', verifyToken, triggerReferralBonus);

// Force process missing referral bonuses (manual fix)
router.post('/force-fix-bonuses', verifyToken, forceProcessMissingBonuses);

// Process all missing bonuses for all users (system-wide fix)
router.post('/process-all-missing-bonuses', verifyToken, processAllMissingBonusesController);

export default router;
