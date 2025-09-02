import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  getReferralInfo,
  getReferralStats,
  validateReferralCode,
} from "../controllers/referralController.js";
import { processReferralBonus } from "../utils/referralBonusService.js";

const router = express.Router();

// Get user's referral information
router.get("/info", verifyToken, getReferralInfo);

// Get referral statistics
router.get("/stats", verifyToken, getReferralStats);

// Validate referral code (public endpoint)
router.get("/validate/:referralCode", validateReferralCode);

// Manual referral bonus processing endpoint (for testing/debugging)
router.post("/process-bonus", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await processReferralBonus(userId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        bonusAmount: result.bonusAmount,
        newBalance: result.newBalance,
        totalReferrals: result.totalReferrals,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Manual bonus processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing referral bonus",
      error: error.message,
    });
  }
});

export default router;
