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

// Manual trigger for referral bonus processing (for debugging)
export const triggerReferralBonus = async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    console.log(`🔧 Manual referral bonus trigger for user ${userId}`)
    console.log(`📊 Current stats:`, {
      totalReferrals: user.referredUsers?.length || 0,
      lastBonusAt: user.referralStats?.lastBonusAt || 0,
      nextBonusAt: user.referralStats?.nextBonusAt || 3
    })

    const result = await processReferralBonus(userId)

    if (result.success) {
      console.log(`✅ Manual referral bonus processed:`, result)
      res.json({
        success: true,
        message: "Referral bonus processed successfully",
        ...result
      })
    } else {
      console.log(`❌ Manual referral bonus failed:`, result)
      res.json({
        success: false,
        message: "No referral bonus to process",
        ...result
      })
    }
  } catch (error) {
    console.error("Manual referral bonus trigger error:", error)
    res.status(500).json({ 
      success: false,
      message: "Error processing referral bonus", 
      error: error.message 
    })
  }
}

// Force process missing referral bonuses (manual fix)
export const forceProcessMissingBonuses = async (req, res) => {
  try {
    const userId = req.user.id

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    console.log(`🔧 Force processing missing bonuses for user ${userId}`)
    console.log(`📊 Current stats:`, {
      totalReferrals: user.referredUsers?.length || 0,
      lastBonusAt: user.referralStats?.lastBonusAt || 0,
      nextBonusAt: user.referralStats?.nextBonusAt || 3
    })

    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" })
    }

    // Calculate missing bonuses based on TOTAL referrals reached
    const totalReferrals = user.referredUsers?.length || 0
    
    // Count actual bonuses given by checking transaction records
    const referralTransactions = await Transaction.find({
      wallet: wallet._id,
      reason: "REFERRAL_BONUS",
      type: "credit"
    })
    const bonusesActuallyGiven = referralTransactions.length
    
    // Calculate how many bonuses should be earned based on total referrals
    // Every 3 referrals = 1 bonus: 3, 6, 9, 12, 15, etc.
    const totalBonusesEarned = Math.floor(totalReferrals / 3)
    const missingBonuses = totalBonusesEarned - bonusesActuallyGiven
    
    console.log(`📊 Analysis:`)
    console.log(`- Total referrals: ${totalReferrals}`)
    console.log(`- Last bonus at: ${user.referralStats?.lastBonusAt || 0}`)
    console.log(`- Total bonuses that should be earned: ${totalBonusesEarned}`)
    console.log(`- Bonuses actually given: ${bonusesActuallyGiven}`)
    console.log(`- Missing bonuses: ${missingBonuses}`)
    console.log(`- Current wallet balance: ${wallet.balance}`)

    if (missingBonuses > 0) {
      const bonusAmount = missingBonuses * 500
      console.log(`🎁 Processing ${missingBonuses} missing bonus(es) worth ₦${bonusAmount}`)
      
      // Add bonus to wallet
      wallet.balance += bonusAmount
      await wallet.save()
      
      // Create transaction record
      const transaction = await Transaction.create({
        wallet: wallet._id,
        user: userId,
        type: "credit",
        amount: bonusAmount,
        reason: "REFERRAL_BONUS",
        description: `Manual referral bonus fix for ${totalReferrals} referrals (${missingBonuses} missing bonuses)`,
        metadata: {
          referralCount: totalReferrals,
          isManualFix: true
        }
      })
      
      // Update user referral stats
      user.referralStats.lastBonusAt = totalReferrals
      user.referralStats.totalBonusesEarned = (user.referralStats.totalBonusesEarned || 0) + bonusAmount
      await user.save()
      
      console.log(`✅ Successfully added ₦${bonusAmount} to wallet`)
      console.log(`✅ New wallet balance: ₦${wallet.balance}`)
      console.log(`✅ Transaction created: ${transaction._id}`)
      console.log(`✅ User stats updated: lastBonusAt = ${totalReferrals}`)
      
      res.json({
        success: true,
        message: `Successfully processed ${missingBonuses} missing bonus(es)`,
        bonusAmount,
        newBalance: wallet.balance,
        totalReferrals,
        missingBonuses,
        transactionId: transaction._id
      })
    } else {
      console.log('❌ No missing bonuses to process')
      res.json({
        success: false,
        message: "No missing bonuses to process",
        totalReferrals,
        lastBonusAt: user.referralStats?.lastBonusAt || 0,
        totalBonusesEarned,
        bonusesActuallyGiven,
        missingBonuses
      })
    }
  } catch (error) {
    console.error("Force process missing bonuses error:", error)
    res.status(500).json({ 
      success: false,
      message: "Error processing missing bonuses", 
      error: error.message 
    })
  }
}

// Process all missing bonuses for all users (system-wide fix)
export const processAllMissingBonusesController = async (req, res) => {
  try {
    console.log(`🔧 Admin requested system-wide missing bonus processing`)
    
    const result = await processAllMissingBonuses()
    
    if (result.success) {
      res.json({
        success: true,
        message: "System-wide bonus processing completed successfully",
        ...result
      })
    } else {
      res.status(500).json({
        success: false,
        message: "System-wide bonus processing failed",
        ...result
      })
    }
  } catch (error) {
    console.error("System-wide bonus processing error:", error)
    res.status(500).json({ 
      success: false,
      message: "Error processing system-wide bonuses", 
      error: error.message 
    })
  }
}
