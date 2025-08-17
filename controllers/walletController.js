import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import User from "../models/User.js"

export const getWalletData = async (req, res) => {
  try {
    const userId = req.user.id

    console.log(`🔍 Fetching wallet data for user: ${userId}`)

    // Get wallet
    let wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      wallet = await Wallet.create({ user: userId, balance: 0 })
    }

    console.log(`💰 Current wallet balance: ${wallet.balance}`)

    // Get all transactions with pagination
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const transactions = await Transaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('metadata.orderId', 'trackingNumber totalAmount')
      .populate('metadata.groupBuyId', 'productId status unitsSold')

    // Get total transaction count for pagination
    const totalTransactions = await Transaction.countDocuments({ wallet: wallet._id })

    // Calculate referral earnings (all REFERRAL_BONUS transactions)
    const referralTransactions = await Transaction.find({ 
      wallet: wallet._id, 
      reason: 'REFERRAL_BONUS',
      type: 'credit'
    })
    
    console.log(`🎁 Found ${referralTransactions.length} referral bonus transactions`)
    referralTransactions.forEach(tx => {
      console.log(`  - Transaction: ${tx._id}, Amount: ${tx.amount}, Date: ${tx.createdAt}`)
    })
    
    const referralEarnings = referralTransactions.reduce((total, transaction) => total + transaction.amount, 0)
    console.log(`💵 Total referral earnings calculated: ${referralEarnings}`)
    
    // Calculate total earned (all credit transactions)
    const creditTransactions = await Transaction.find({ 
      wallet: wallet._id, 
      type: 'credit'
    })
    
    const totalEarned = creditTransactions.reduce((total, transaction) => total + transaction.amount, 0)

    // Calculate total spent (all debit transactions)
    const debitTransactions = await Transaction.find({ 
      wallet: wallet._id, 
      type: 'debit'
    })
    
    const totalSpent = debitTransactions.reduce((total, transaction) => total + transaction.amount, 0)

    // Get user referral info for context
    const user = await User.findById(userId).select("referralCode referredUsers referralStats")

    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      reason: transaction.reason,
      description: transaction.description,
      createdAt: transaction.createdAt,
      metadata: {
        orderId: transaction.metadata?.orderId?._id,
        orderTrackingNumber: transaction.metadata?.orderId?.trackingNumber,
        groupBuyId: transaction.metadata?.groupBuyId?._id,
        groupBuyStatus: transaction.metadata?.groupBuyId?.status,
        referralCount: transaction.metadata?.referralCount,
      }
    }))

    res.json({
      balance: wallet.balance,
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total: totalTransactions,
        pages: Math.ceil(totalTransactions / limit),
        hasNext: page * limit < totalTransactions,
        hasPrev: page > 1
      },
      stats: {
        referralEarnings,
        totalEarned,
        totalSpent,
        netBalance: totalEarned - totalSpent
      },
      referralInfo: {
        referralCode: user.referralCode,
        totalReferrals: user.referredUsers?.length || 0,
        referralsNeeded: Math.max(0, (user.referralStats?.nextBonusAt || 3) - (user.referredUsers?.length || 0)),
        referralStats: user.referralStats || {
          totalReferrals: 0,
          totalBonusesEarned: 0,
          lastBonusAt: 0,
          nextBonusAt: 3
        }
      },
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
        canUseWallet: false,
        message: "No wallet found"
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
      canUseWallet: wallet.balance > 0,
      message: wallet.balance > 0 ? "Wallet can be used for payment" : "Insufficient wallet balance"
    })
  } catch (error) {
    console.error("Calculate wallet offset error:", error)
    res.status(500).json({ message: "Error calculating wallet offset", error: error.message })
  }
}

// Get transaction history with filters
export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id
    const { type, reason, page = 1, limit = 20 } = req.query

    const wallet = await Wallet.findOne({ user: userId })
    if (!wallet) {
      return res.json({
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      })
    }

    // Build filter
    const filter = { wallet: wallet._id }
    if (type) filter.type = type
    if (reason) filter.reason = reason

    const skip = (page - 1) * limit

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('metadata.orderId', 'trackingNumber totalAmount')
      .populate('metadata.groupBuyId', 'productId status unitsSold')

    const total = await Transaction.countDocuments(filter)

    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      reason: transaction.reason,
      description: transaction.description,
      createdAt: transaction.createdAt,
      metadata: {
        orderId: transaction.metadata?.orderId?._id,
        orderTrackingNumber: transaction.metadata?.orderId?.trackingNumber,
        groupBuyId: transaction.metadata?.groupBuyId?._id,
        groupBuyStatus: transaction.metadata?.groupBuyId?.status,
        referralCount: transaction.metadata?.referralCount,
      }
    }))

    res.json({
      transactions: formattedTransactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error("Get transaction history error:", error)
    res.status(500).json({ message: "Error fetching transaction history", error: error.message })
  }
}
