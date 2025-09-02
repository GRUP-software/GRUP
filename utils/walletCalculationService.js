import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";

/**
 * Wallet Calculation Service
 * Centralized service for all wallet-related calculations
 * Ensures consistency between frontend and backend calculations
 */

// Calculate referral bonus amount based on total referrals
export const calculateReferralBonusAmount = (
  totalReferrals,
  bonusPerRound = 500,
  referralsPerRound = 3,
) => {
  const completedRounds = Math.floor(totalReferrals / referralsPerRound);
  return completedRounds * bonusPerRound;
};

// Calculate total bonus earned (including already given bonuses)
export const calculateTotalBonusEarned = (
  totalReferrals,
  bonusPerRound = 500,
  referralsPerRound = 3,
) => {
  return calculateReferralBonusAmount(
    totalReferrals,
    bonusPerRound,
    referralsPerRound,
  );
};

// Calculate referral rounds completed
export const calculateReferralRounds = (
  totalReferrals,
  referralsPerRound = 3,
) => {
  return Math.floor(totalReferrals / referralsPerRound);
};

// Calculate referrals needed for next bonus
export const calculateReferralsNeededForNextBonus = (
  totalReferrals,
  referralsPerRound = 3,
) => {
  const nextBonusMilestone =
    Math.ceil((totalReferrals + 1) / referralsPerRound) * referralsPerRound;
  return Math.max(0, nextBonusMilestone - totalReferrals);
};

// Calculate progress percentage towards next bonus
export const calculateBonusProgressPercentage = (
  totalReferrals,
  referralsPerRound = 3,
) => {
  if (totalReferrals === 0) return 0;
  return ((totalReferrals % referralsPerRound) / referralsPerRound) * 100;
};

// Get comprehensive wallet statistics
export const getWalletStatistics = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return {
        balance: 0,
        totalTransactions: 0,
        referralEarnings: 0,
        totalEarned: 0,
        totalSpent: 0,
        netBalance: 0,
        referralStats: {
          totalReferrals: 0,
          completedRounds: 0,
          referralsNeededForNextBonus: 3,
          progressPercentage: 0,
          totalBonusEarned: 0,
          bonusesActuallyGiven: 0,
          missingBonuses: 0,
        },
      };
    }

    // Get all transactions for this wallet
    const transactions = await Transaction.find({ wallet: wallet._id });

    // Calculate transaction statistics
    const totalTransactions = transactions.length;

    const referralTransactions = transactions.filter(
      (tx) => tx.reason === "REFERRAL_BONUS" && tx.type === "credit",
    );

    const creditTransactions = transactions.filter(
      (tx) => tx.type === "credit",
    );
    const debitTransactions = transactions.filter((tx) => tx.type === "debit");

    const referralEarnings = referralTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    const totalEarned = creditTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    const totalSpent = debitTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    const netBalance = totalEarned - totalSpent;

    // Calculate referral statistics
    const totalReferrals = user.referredUsers?.length || 0;
    const completedRounds = calculateReferralRounds(totalReferrals);
    const referralsNeededForNextBonus =
      calculateReferralsNeededForNextBonus(totalReferrals);
    const progressPercentage = calculateBonusProgressPercentage(totalReferrals);
    const totalBonusEarned = calculateTotalBonusEarned(totalReferrals);
    const bonusesActuallyGiven = referralEarnings / 500; // ₦500 per bonus
    const missingBonuses = Math.max(0, totalBonusEarned - referralEarnings);

    return {
      balance: wallet.balance,
      totalTransactions,
      referralEarnings,
      totalEarned,
      totalSpent,
      netBalance,
      referralStats: {
        totalReferrals,
        completedRounds,
        referralsNeededForNextBonus,
        progressPercentage,
        totalBonusEarned,
        bonusesActuallyGiven,
        missingBonuses,
      },
    };
  } catch (error) {
    console.error("Error getting wallet statistics:", error);
    throw error;
  }
};

// Calculate wallet offset for checkout
export const calculateWalletOffset = async (
  userId,
  totalAmount,
  requestedWalletUse = null,
) => {
  try {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return {
        walletBalance: 0,
        maxWalletUse: 0,
        walletUsed: 0,
        remainingToPay: totalAmount,
        canUseWallet: false,
        message: "No wallet found",
      };
    }

    const maxWalletUse = Math.min(wallet.balance, totalAmount);
    const walletUsed =
      requestedWalletUse !== null
        ? Math.min(requestedWalletUse, maxWalletUse)
        : maxWalletUse;
    const remainingToPay = totalAmount - walletUsed;

    return {
      walletBalance: wallet.balance,
      maxWalletUse,
      walletUsed,
      remainingToPay: Math.max(0, remainingToPay),
      canUseWallet: wallet.balance > 0,
      message:
        wallet.balance > 0
          ? "Wallet can be used for payment"
          : "Insufficient wallet balance",
    };
  } catch (error) {
    console.error("Error calculating wallet offset:", error);
    throw error;
  }
};

// Get transaction summary with filters
export const getTransactionSummary = async (userId, filters = {}) => {
  try {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return {
        totalTransactions: 0,
        totalAmount: 0,
        averageAmount: 0,
        byType: { credit: 0, debit: 0 },
        byReason: { ORDER: 0, REFERRAL_BONUS: 0, REFUND: 0 },
      };
    }

    const matchCriteria = { wallet: wallet._id };

    // Apply filters
    if (filters.type) matchCriteria.type = filters.type;
    if (filters.reason) matchCriteria.reason = filters.reason;
    if (filters.startDate)
      matchCriteria.createdAt = { $gte: new Date(filters.startDate) };
    if (filters.endDate) {
      if (matchCriteria.createdAt) {
        matchCriteria.createdAt.$lte = new Date(filters.endDate);
      } else {
        matchCriteria.createdAt = { $lte: new Date(filters.endDate) };
      }
    }

    const transactions = await Transaction.find(matchCriteria);

    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const averageAmount =
      totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Group by type
    const byType = transactions.reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    }, {});

    // Group by reason
    const byReason = transactions.reduce((acc, tx) => {
      acc[tx.reason] = (acc[tx.reason] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTransactions,
      totalAmount,
      averageAmount,
      byType,
      byReason,
    };
  } catch (error) {
    console.error("Error getting transaction summary:", error);
    throw error;
  }
};

// Validate referral bonus eligibility
export const validateReferralBonusEligibility = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { eligible: false, reason: "User not found" };
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return { eligible: false, reason: "Wallet not found" };
    }

    const totalReferrals = user.referredUsers?.length || 0;
    const totalBonusEarned = calculateTotalBonusEarned(totalReferrals);

    // Get actual bonuses given
    const referralTransactions = await Transaction.find({
      wallet: wallet._id,
      reason: "REFERRAL_BONUS",
      type: "credit",
    });

    const bonusesActuallyGiven = referralTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );
    const missingBonuses = Math.max(0, totalBonusEarned - bonusesActuallyGiven);

    return {
      eligible: missingBonuses > 0,
      totalReferrals,
      totalBonusEarned,
      bonusesActuallyGiven,
      missingBonuses,
      bonusAmount: missingBonuses,
      reason:
        missingBonuses > 0
          ? `Eligible for ${missingBonuses} bonus(es)`
          : `Need ${3 - (totalReferrals % 3)} more referrals for next bonus`,
    };
  } catch (error) {
    console.error("Error validating referral bonus eligibility:", error);
    throw error;
  }
};

// Export calculation functions for frontend use
export const calculationHelpers = {
  calculateReferralBonusAmount,
  calculateTotalBonusEarned,
  calculateReferralRounds,
  calculateReferralsNeededForNextBonus,
  calculateBonusProgressPercentage,
};
