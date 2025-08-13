import User from "../models/User.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"

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
    const referralLink = `${frontendUrl}/signup?ref=${user.referralCode}`

    res.json({
      referralCode: user.referralCode,
      referralLink,
      referredUsers: user.referredUsers || [],
      referredBy: user.referredBy,
      totalReferrals: user.referredUsers?.length || 0,
      hasReceivedBonus: user.hasReceivedReferralBonus,
      referralsNeeded: Math.max(0, 3 - (user.referredUsers?.length || 0)),
      bonusAmount: 500,
      referralTransactions,
      walletBalance: wallet?.balance || 0,
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
    const referralsNeeded = Math.max(0, 3 - totalReferrals)
    const progressPercentage = Math.min(100, (totalReferrals / 3) * 100)

    res.json({
      totalReferrals,
      referralsNeeded,
      progressPercentage,
      hasReceivedBonus: user.hasReceivedReferralBonus,
      bonusAmount: 500,
      nextMilestone: user.hasReceivedReferralBonus ? null : 3,
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
