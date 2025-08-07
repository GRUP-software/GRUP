import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import User from "../models/User.js"

export const getWalletData = async (req, res) => {
  try {
    const userId = req.user.id

    // Get wallet
    let wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: 0 })
    }

    // Get transactions
    const transactions = await Transaction.find({ wallet: wallet._id }).sort({ createdAt: -1 }).limit(50)

    // Get user referral info for context
    const user = await User.findById(userId).select('referralCode hasReceivedReferralBonus referredUsers')

    res.json({
      balance: wallet.balance,
      transactions,
      referralInfo: {
        referralCode: user.referralCode,
        hasReceivedBonus: user.hasReceivedReferralBonus,
        totalReferrals: user.referredUsers?.length || 0,
        referralsNeeded: Math.max(0, 3 - (user.referredUsers?.length || 0)),
      }
    })
  } catch (error) {
    console.error("Get wallet error:", error)
    res.status(500).json({ message: "Error fetching wallet data", error: error.message })
  }
}

// Calculate wallet offset for checkout
export const calculateWalletOffset = async (req, res) => {
  try {
    const { totalAmount, requestedWalletUse } = req.body
    const userId = req.user.id

    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      return res.json({
        walletBalance: 0,
        maxWalletUse: 0,
        walletUsed: 0,
        remainingToPay: totalAmount,
      })
    }

    const maxWalletUse = Math.min(wallet.balance, totalAmount)
    const walletUsed = requestedWalletUse ? Math.min(requestedWalletUse, maxWalletUse) : maxWalletUse
    const remainingToPay = totalAmount - walletUsed

    res.json({
      walletBalance: wallet.balance,
      maxWalletUse,
      walletUsed,
      remainingToPay: Math.max(0, remainingToPay),
    })
  } catch (error) {
    console.error("Calculate wallet offset error:", error)
    res.status(500).json({ message: "Error calculating wallet offset", error: error.message })
  }
}
