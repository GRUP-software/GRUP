import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import logger from "./logger.js";

/**
 * Wallet Transaction Service
 * Handles all wallet operations with proper database transactions and error recovery
 * Includes fallback for standalone MongoDB instances
 */

// Check if MongoDB supports transactions
const checkTransactionSupport = async () => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await session.abortTransaction();
    session.endSession();
    return true;
  } catch (error) {
    return false;
  }
};

// Force atomic operations for standalone MongoDB
const FORCE_ATOMIC = true; // Set to true for standalone MongoDB

// Process wallet debit with transaction safety
export const processWalletDebit = async (
  userId,
  amount,
  reason,
  description,
  metadata = {},
) => {
  if (FORCE_ATOMIC) {
    return processWalletDebitAtomic(
      userId,
      amount,
      reason,
      description,
      metadata,
    );
  }

  const supportsTransactions = await checkTransactionSupport();

  if (supportsTransactions) {
    return processWalletDebitWithTransaction(
      userId,
      amount,
      reason,
      description,
      metadata,
    );
  } else {
    return processWalletDebitAtomic(
      userId,
      amount,
      reason,
      description,
      metadata,
    );
  }
};

// Process wallet credit with transaction safety
export const processWalletCredit = async (
  userId,
  amount,
  reason,
  description,
  metadata = {},
) => {
  if (FORCE_ATOMIC) {
    return processWalletCreditAtomic(
      userId,
      amount,
      reason,
      description,
      metadata,
    );
  }

  const supportsTransactions = await checkTransactionSupport();

  if (supportsTransactions) {
    return processWalletCreditWithTransaction(
      userId,
      amount,
      reason,
      description,
      metadata,
    );
  } else {
    return processWalletCreditAtomic(
      userId,
      amount,
      reason,
      description,
      metadata,
    );
  }
};

// Transaction-based debit (for replica sets)
const processWalletDebitWithTransaction = async (
  userId,
  amount,
  reason,
  description,
  metadata = {},
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(
      `💳 Processing wallet debit (transaction): User ${userId}, Amount: ₦${amount}, Reason: ${reason}`,
    );

    // Find wallet with session
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Validate balance
    if (wallet.balance < amount) {
      throw new Error(
        `Insufficient balance. Current: ₦${wallet.balance}, Required: ₦${amount}`,
      );
    }

    // Store original balance for potential rollback
    const originalBalance = wallet.balance;

    // Update wallet balance atomically
    const updatedWallet = await Wallet.findByIdAndUpdate(
      wallet._id,
      { $inc: { balance: -amount } },
      { session, new: true },
    );

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          wallet: wallet._id,
          user: userId,
          type: "debit",
          amount: amount,
          reason: reason,
          description: description,
          metadata: {
            ...metadata,
            originalBalance,
            newBalance: updatedWallet.balance,
            transactionId: new mongoose.Types.ObjectId(),
          },
        },
      ],
      { session },
    );

    // Log the transaction
    await logger.info("Wallet Debit Transaction", {
      userId,
      walletId: wallet._id,
      transactionId: transaction[0]._id,
      amount,
      reason,
      originalBalance,
      newBalance: updatedWallet.balance,
      metadata,
    });

    await session.commitTransaction();
    console.log(
      `✅ Wallet debit successful: ₦${amount} deducted from user ${userId}`,
    );

    return {
      success: true,
      transaction: transaction[0],
      newBalance: updatedWallet.balance,
      originalBalance,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error(`❌ Wallet debit failed for user ${userId}:`, error.message);

    await logger.error("Wallet Debit Transaction Failed", {
      userId,
      amount,
      reason,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  } finally {
    session.endSession();
  }
};

// Atomic-based debit (for standalone MongoDB)
const processWalletDebitAtomic = async (
  userId,
  amount,
  reason,
  description,
  metadata = {},
) => {
  try {
    // Use findOneAndUpdate with atomic operation for consistency
    const result = await Wallet.findOneAndUpdate(
      { user: userId, balance: { $gte: amount } }, // Only update if sufficient balance
      { $inc: { balance: -amount } },
      { new: true },
    );

    if (!result) {
      // Check if wallet exists but insufficient balance
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        throw new Error("Wallet not found");
      }
      throw new Error(
        `Insufficient balance. Current: ₦${wallet.balance}, Required: ₦${amount}`,
      );
    }

    const originalBalance = result.balance + amount; // Calculate original balance

    // Create transaction record
    const transaction = await Transaction.create({
      wallet: result._id,
      user: userId,
      type: "debit",
      amount: amount,
      reason: reason,
      description: description,
      metadata: {
        ...metadata,
        originalBalance,
        newBalance: result.balance,
        transactionId: new mongoose.Types.ObjectId(),
      },
    });

    // Log the transaction
    await logger.info("Wallet Debit Atomic", {
      userId,
      walletId: result._id,
      transactionId: transaction._id,
      amount,
      reason,
      originalBalance,
      newBalance: result.balance,
      metadata,
    });

    return {
      success: true,
      transaction: transaction,
      newBalance: result.balance,
      originalBalance,
    };
  } catch (error) {
    await logger.error("Wallet Debit Atomic Failed", {
      userId,
      amount,
      reason,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

// Transaction-based credit (for replica sets)
const processWalletCreditWithTransaction = async (
  userId,
  amount,
  reason,
  description,
  metadata = {},
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(
      `💳 Processing wallet credit (transaction): User ${userId}, Amount: ₦${amount}, Reason: ${reason}`,
    );

    // Find or create wallet with session
    let wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      wallet = await Wallet.create([{ user: userId, balance: 0 }], { session });
      wallet = wallet[0];
    }

    // Store original balance for audit
    const originalBalance = wallet.balance;

    // Update wallet balance atomically
    const updatedWallet = await Wallet.findByIdAndUpdate(
      wallet._id,
      { $inc: { balance: amount } },
      { session, new: true },
    );

    // Create transaction record
    const transaction = await Transaction.create(
      [
        {
          wallet: wallet._id,
          user: userId,
          type: "credit",
          amount: amount,
          reason: reason,
          description: description,
          metadata: {
            ...metadata,
            originalBalance,
            newBalance: updatedWallet.balance,
            transactionId: new mongoose.Types.ObjectId(),
          },
        },
      ],
      { session },
    );

    // Log the transaction
    await logger.info("Wallet Credit Transaction", {
      userId,
      walletId: wallet._id,
      transactionId: transaction[0]._id,
      amount,
      reason,
      originalBalance,
      newBalance: updatedWallet.balance,
      metadata,
    });

    await session.commitTransaction();
    console.log(
      `✅ Wallet credit successful: ₦${amount} added to user ${userId}`,
    );

    return {
      success: true,
      transaction: transaction[0],
      newBalance: updatedWallet.balance,
      originalBalance,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error(`❌ Wallet credit failed for user ${userId}:`, error.message);

    await logger.error("Wallet Credit Transaction Failed", {
      userId,
      amount,
      reason,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  } finally {
    session.endSession();
  }
};

// Atomic-based credit (for standalone MongoDB)
const processWalletCreditAtomic = async (
  userId,
  amount,
  reason,
  description,
  metadata = {},
) => {
  try {
    // Use findOneAndUpdate with upsert for atomic operation
    const result = await Wallet.findOneAndUpdate(
      { user: userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true },
    );

    const originalBalance = result.balance - amount; // Calculate original balance

    // Create transaction record
    const transaction = await Transaction.create({
      wallet: result._id,
      user: userId,
      type: "credit",
      amount: amount,
      reason: reason,
      description: description,
      metadata: {
        ...metadata,
        originalBalance,
        newBalance: result.balance,
        transactionId: new mongoose.Types.ObjectId(),
      },
    });

    // Log the transaction
    await logger.info("Wallet Credit Atomic", {
      userId,
      walletId: result._id,
      transactionId: transaction._id,
      amount,
      reason,
      originalBalance,
      newBalance: result.balance,
      metadata,
    });

    return {
      success: true,
      transaction: transaction,
      newBalance: result.balance,
      originalBalance,
    };
  } catch (error) {
    await logger.error("Wallet Credit Atomic Failed", {
      userId,
      amount,
      reason,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
};

// Get wallet data with aggregated calculations
export const getWalletDataWithAggregation = async (
  userId,
  page = 1,
  limit = 20,
) => {
  try {
    const skip = (page - 1) * limit;

    // Get wallet with aggregated stats
    const walletData = await Wallet.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "wallet",
          as: "transactions",
        },
      },
      {
        $addFields: {
          totalTransactions: { $size: "$transactions" },
          referralEarnings: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$transactions",
                    cond: {
                      $and: [
                        { $eq: ["$$this.reason", "REFERRAL_BONUS"] },
                        { $eq: ["$$this.type", "credit"] },
                      ],
                    },
                  },
                },
                as: "tx",
                in: "$$tx.amount",
              },
            },
          },
          totalEarned: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$transactions",
                    cond: { $eq: ["$$this.type", "credit"] },
                  },
                },
                as: "tx",
                in: "$$tx.amount",
              },
            },
          },
          totalSpent: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$transactions",
                    cond: { $eq: ["$$this.type", "debit"] },
                  },
                },
                as: "tx",
                in: "$$tx.amount",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          balance: 1,
          totalTransactions: 1,
          referralEarnings: 1,
          totalEarned: 1,
          totalSpent: 1,
          netBalance: { $subtract: ["$totalEarned", "$totalSpent"] },
        },
      },
    ]);

    // Get paginated transactions
    const transactions = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "orders",
          localField: "metadata.orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $lookup: {
          from: "groupbuys",
          localField: "metadata.groupBuyId",
          foreignField: "_id",
          as: "groupBuy",
        },
      },
      {
        $addFields: {
          orderTrackingNumber: { $arrayElemAt: ["$order.trackingNumber", 0] },
          groupBuyStatus: { $arrayElemAt: ["$groupBuy.status", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          amount: 1,
          reason: 1,
          description: 1,
          createdAt: 1,
          metadata: 1,
          orderTrackingNumber: 1,
          groupBuyStatus: 1,
        },
      },
    ]);

    // Get total transaction count for pagination
    const totalTransactions = await Transaction.countDocuments({
      user: userId,
    });

    const wallet = walletData[0] || {
      balance: 0,
      totalTransactions: 0,
      referralEarnings: 0,
      totalEarned: 0,
      totalSpent: 0,
      netBalance: 0,
    };

    return {
      balance: wallet.balance,
      transactions,
      stats: {
        referralEarnings: wallet.referralEarnings,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        netBalance: wallet.netBalance,
      },
      pagination: {
        page,
        limit,
        total: totalTransactions,
        pages: Math.ceil(totalTransactions / limit),
        hasNext: page * limit < totalTransactions,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    console.error("Error getting wallet data with aggregation:", error);
    throw error;
  }
};

// Validate wallet balance without deduction
export const validateWalletBalance = async (userId, amount) => {
  try {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return { valid: false, message: "Wallet not found", currentBalance: 0 };
    }

    if (wallet.balance < amount) {
      return {
        valid: false,
        message: "Insufficient wallet balance",
        currentBalance: wallet.balance,
        requiredAmount: amount,
        shortfall: amount - wallet.balance,
      };
    }

    return { valid: true, currentBalance: wallet.balance };
  } catch (error) {
    console.error("Error validating wallet balance:", error);
    throw error;
  }
};

// Rollback wallet transaction (for error recovery)
export const rollbackWalletTransaction = async (transactionId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction =
      await Transaction.findById(transactionId).session(session);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Reverse the transaction
    const reverseAmount =
      transaction.type === "credit" ? -transaction.amount : transaction.amount;
    const reverseType = transaction.type === "credit" ? "debit" : "credit";

    // Update wallet balance
    await Wallet.findByIdAndUpdate(
      transaction.wallet,
      { $inc: { balance: reverseAmount } },
      { session },
    );

    // Create rollback transaction
    const rollbackTransaction = await Transaction.create(
      [
        {
          wallet: transaction.wallet,
          user: transaction.user,
          type: reverseType,
          amount: transaction.amount,
          reason: "REFUND",
          description: `Rollback of transaction ${transactionId}: ${transaction.description}`,
          metadata: {
            originalTransactionId: transactionId,
            rollbackReason: "system_error_recovery",
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();

    await logger.info("Wallet Transaction Rollback", {
      originalTransactionId: transactionId,
      rollbackTransactionId: rollbackTransaction[0]._id,
      userId: transaction.user,
      amount: transaction.amount,
      reason: "system_error_recovery",
    });

    return { success: true, rollbackTransaction: rollbackTransaction[0] };
  } catch (error) {
    await session.abortTransaction();
    console.error("Error rolling back wallet transaction:", error);
    throw error;
  } finally {
    session.endSession();
  }
};
