import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"

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

    res.json({
      balance: wallet.balance,
      transactions,
    })
  } catch (error) {
    console.error("Get wallet error:", error)
    res.status(500).json({ message: "Error fetching wallet data", error: error.message })
  }
}
