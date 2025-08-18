import User from "../models/User.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import Order from "../models/order.js"
import { processReferralBonus, processAllMissingBonuses } from "../utils/referralBonusService.js"

// Get user's referral information
export const getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findById(userId)
      .populate("referredUsers", "name email createdAt")
      .populate("referredBy", "name email")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const wallet = await Wallet.findOne({ user: userId })
    const referralTransactions = await Transaction.find({
      wallet: wallet?._id,
      reason: "REFERRAL_BONUS",
    }).sort({ createdAt: -1 })

    const frontendUrl = process.env.NODE_ENV === "development" ? "http://localhost:4000" : process.env.FRONTEND_URL
    const referralLink = `${frontendUrl}/register?ref=${user.referralCode}`

    // Get detailed referred users with purchase information
    const referredUsersWithDetails = await Promise.all(
      (user.referredUsers || []).map(async (referredUser) => {
        // Check if user has made any purchases
        const userOrders = await Order.find({ user: referredUser._id })
        const hasMadePurchase = userOrders.length > 0
        const purchaseAmount = hasMadePurchase 
          ? userOrders.reduce((total, order) => total + (order.totalAmount || 0), 0)
          : 0

        return {
          id: referredUser._id,
          name: referredUser.name,
          email: referredUser.email,
          joinedAt: referredUser.createdAt,
          status: "active", // You can add a status field to User model if needed
          hasMadePurchase,
          purchaseAmount
        }
      })
    )

    const totalEarnings = referralTransactions.reduce((total, transaction) => total + (transaction.amount || 0), 0)
    const nextBonusThreshold = 3

    res.json({
      referralCode: user.referralCode,
      referralLink,
      referredUsers: referredUsersWithDetails,
      referralCount: user.referredUsers?.length || 0,
      totalEarnings,
      nextBonusThreshold: user.referralStats?.nextBonusAt || 3,
      referralStats: user.referralStats || {
        totalReferrals: 0,
        totalBonusesEarned: 0,
        lastBonusAt: 0,
        nextBonusAt: 3
      }
    })
  } catch (error) {
    console.error("Get referral info error:", error)
    res.status(500).json({ message: "Error fetching referral information", error: error.message })
  }
}

// Get referral statistics
export const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const totalReferrals = user.referredUsers?.length || 0
    const nextBonusAt = user.referralStats?.nextBonusAt || 3
    const remainingForBonus = Math.max(0, nextBonusAt - totalReferrals)
    
    // Get referral bonus transactions
    const wallet = await Wallet.findOne({ user: userId })
    const referralTransactions = await Transaction.find({
      wallet: wallet?._id,
      reason: "REFERRAL_BONUS",
    }).sort({ createdAt: -1 })
    
    const totalEarnings = referralTransactions.reduce((total, transaction) => total + (transaction.amount || 0), 0)
    const bonusEarned = totalEarnings

    // Get referral history with purchase details
    const referralHistory = await Promise.all(
      (user.referredUsers || []).map(async (referredUserId) => {
        const referredUser = await User.findById(referredUserId).select("name email createdAt")
        const userOrders = await Order.find({ user: referredUserId })
        const hasMadePurchase = userOrders.length > 0
        const purchaseAmount = hasMadePurchase 
          ? userOrders.reduce((total, order) => total + (order.totalAmount || 0), 0)
          : 0

        return {
          id: `ref_${referredUserId}`,
          referredUser: referredUser.name,
          joinedAt: referredUser.createdAt,
          status: "active",
          hasMadePurchase,
          purchaseAmount
        }
      })
    )

    res.json({
      totalReferrals,
      bonusEarned,
      nextBonusAt,
      remainingForBonus,
      totalEarnings,
      nextBonusThreshold: user.referralStats?.nextBonusAt || 3,
      referralHistory,
      referralStats: user.referralStats || {
        totalReferrals: 0,
        totalBonusesEarned: 0,
        lastBonusAt: 0,
        nextBonusAt: 3
      }
    })
  } catch (error) {
    console.error("Get referral stats error:", error)
    res.status(500).json({ message: "Error fetching referral statistics", error: error.message })
  }
}

// Validate referral code
export const validateReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.params

    const referrer = await User.findOne({ referralCode }).select("name email referralCode")

    if (!referrer) {
      return res.status(404).json({
        valid: false,
        message: "Invalid referral code",
      })
    }

    res.json({
      valid: true,
      referrer: {
        name: referrer.name,
        referralCode: referrer.referralCode,
      },
      message: `You will be referred by ${referrer.name}`,
    })
  } catch (error) {
    console.error("Validate referral code error:", error)
    res.status(500).json({ message: "Error validating referral code", error: error.message })
  }
}




