import logger from "./logger.js";

/**
 * Wallet Logger Service
 * Provides comprehensive logging for all wallet operations
 */

// Log wallet balance changes
export const logWalletBalanceChange = async (
  userId,
  oldBalance,
  newBalance,
  reason,
  metadata = {},
) => {
  try {
    await logger.info("Wallet Balance Change", {
      userId,
      oldBalance,
      newBalance,
      change: newBalance - oldBalance,
      changeType: newBalance > oldBalance ? "credit" : "debit",
      reason,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet balance change:", error);
  }
};

// Log wallet transaction creation
export const logWalletTransaction = async (
  transactionId,
  userId,
  type,
  amount,
  reason,
  metadata = {},
) => {
  try {
    await logger.info("Wallet Transaction Created", {
      transactionId,
      userId,
      type,
      amount,
      reason,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet transaction:", error);
  }
};

// Log wallet transaction failure
export const logWalletTransactionFailure = async (
  userId,
  type,
  amount,
  reason,
  error,
  metadata = {},
) => {
  try {
    await logger.error("Wallet Transaction Failed", {
      userId,
      type,
      amount,
      reason,
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
      metadata,
    });
  } catch (logError) {
    console.error("Error logging wallet transaction failure:", logError);
  }
};

// Log referral bonus processing
export const logReferralBonus = async (
  userId,
  bonusAmount,
  totalReferrals,
  eligibility,
  metadata = {},
) => {
  try {
    await logger.info("Referral Bonus Processed", {
      userId,
      bonusAmount,
      totalReferrals,
      eligibility,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging referral bonus:", error);
  }
};

// Log wallet cache operations
export const logWalletCacheOperation = async (
  operation,
  userId,
  cacheKey,
  success,
  metadata = {},
) => {
  try {
    await logger.info("Wallet Cache Operation", {
      operation,
      userId,
      cacheKey,
      success,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet cache operation:", error);
  }
};

// Log wallet validation
export const logWalletValidation = async (
  userId,
  validationType,
  result,
  metadata = {},
) => {
  try {
    await logger.info("Wallet Validation", {
      userId,
      validationType,
      result,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet validation:", error);
  }
};

// Log wallet security events
export const logWalletSecurityEvent = async (
  userId,
  eventType,
  details,
  metadata = {},
) => {
  try {
    await logger.warn("Wallet Security Event", {
      userId,
      eventType,
      details,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet security event:", error);
  }
};

// Log wallet performance metrics
export const logWalletPerformance = async (
  operation,
  userId,
  duration,
  success,
  metadata = {},
) => {
  try {
    await logger.info("Wallet Performance", {
      operation,
      userId,
      duration,
      success,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet performance:", error);
  }
};

// Log wallet audit trail
export const logWalletAudit = async (
  userId,
  action,
  details,
  metadata = {},
) => {
  try {
    await logger.info("Wallet Audit Trail", {
      userId,
      action,
      details,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet audit:", error);
  }
};

// Log wallet error with context
export const logWalletError = async (userId, error, context, metadata = {}) => {
  try {
    await logger.error("Wallet Error", {
      userId,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date(),
      metadata,
    });
  } catch (logError) {
    console.error("Error logging wallet error:", logError);
  }
};

// Log wallet system health
export const logWalletSystemHealth = async (metrics, metadata = {}) => {
  try {
    await logger.info("Wallet System Health", {
      metrics,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet system health:", error);
  }
};

// Log wallet user activity
export const logWalletUserActivity = async (
  userId,
  activity,
  details,
  metadata = {},
) => {
  try {
    await logger.info("Wallet User Activity", {
      userId,
      activity,
      details,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet user activity:", error);
  }
};

// Log wallet data consistency check
export const logWalletDataConsistency = async (
  userId,
  checkType,
  result,
  details,
  metadata = {},
) => {
  try {
    await logger.info("Wallet Data Consistency", {
      userId,
      checkType,
      result,
      details,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet data consistency:", error);
  }
};

// Log wallet rollback operations
export const logWalletRollback = async (
  userId,
  originalTransactionId,
  rollbackReason,
  metadata = {},
) => {
  try {
    await logger.warn("Wallet Transaction Rollback", {
      userId,
      originalTransactionId,
      rollbackReason,
      timestamp: new Date(),
      metadata,
    });
  } catch (error) {
    console.error("Error logging wallet rollback:", error);
  }
};

export default {
  logWalletBalanceChange,
  logWalletTransaction,
  logWalletTransactionFailure,
  logReferralBonus,
  logWalletCacheOperation,
  logWalletValidation,
  logWalletSecurityEvent,
  logWalletPerformance,
  logWalletAudit,
  logWalletError,
  logWalletSystemHealth,
  logWalletUserActivity,
  logWalletDataConsistency,
  logWalletRollback,
};
