import Cart from "../models/cart.js"
import Product from "../models/Product.js"
import Wallet from "../models/Wallet.js"
import PaymentHistory from "../models/PaymentHistory.js"
import { nanoid } from "nanoid"

export const checkout = async (req, res) => {
  try {
    const { walletUse = 0 } = req.body
    const userId = req.user.id

    // Get user's cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product")
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" })
    }

    // Verify all cart items and calculate total
    let totalPrice = 0
    const cartItems = []

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product.title} not found` })
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`,
        })
      }

      const itemTotal = product.price * item.quantity
      totalPrice += itemTotal

      cartItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price, // Store price at time of purchase
      })
    }

    // Handle wallet offset
    let walletUsed = 0
    let paystackAmount = totalPrice

    if (walletUse > 0) {
      const wallet = await Wallet.findOne({ user: userId })
      if (!wallet) {
        return res.status(400).json({ message: "Wallet not found" })
      }

      // Crucial security check: walletUsed cannot exceed wallet balance or total price
      walletUsed = Math.min(wallet.balance, walletUse, totalPrice)
      paystackAmount = totalPrice - walletUsed

      if (paystackAmount < 0) paystackAmount = 0
    }

    // Generate unique reference
    const referenceId = `GRP_${nanoid(10)}_${Date.now()}`

    // Create temporary payment history
    const paymentHistory = new PaymentHistory({
      userId,
      referenceId,
      cartItems,
      amount: totalPrice,
      walletUsed,
      paystackAmount,
      status: "pending",
    })

    await paymentHistory.save()

    // If no Paystack payment needed (fully paid by wallet)
    if (paystackAmount === 0) {
      // Process payment immediately
      return await processWalletOnlyPayment(paymentHistory, res)
    }

    // Initialize Paystack payment
    const paystackData = {
      email: req.user.email || "customer@grup.com",
      amount: Math.round(paystackAmount * 100), // Convert to kobo
      reference: referenceId,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        userId: userId,
        paymentHistoryId: paymentHistory._id.toString(),
        walletUsed,
        custom_fields: [
          {
            display_name: "Payment ID",
            variable_name: "payment_id",
            value: paymentHistory._id.toString(),
          },
        ],
      },
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackData),
    })

    const data = await response.json()

    if (data.status) {
      // Update payment history with Paystack reference
      paymentHistory.paystackReference = data.data.reference
      await paymentHistory.save()

      res.json({
        success: true,
        authorization_url: data.data.authorization_url,
        reference: referenceId,
        amount: paystackAmount,
        walletUsed,
        totalAmount: totalPrice,
        message: "Payment initialized successfully",
      })
    } else {
      // Clean up failed payment history
      await PaymentHistory.findByIdAndDelete(paymentHistory._id)
      res.status(400).json({
        success: false,
        message: "Failed to initialize payment",
        error: data.message,
      })
    }
  } catch (error) {
    console.error("Checkout error:", error)
    res.status(500).json({ message: "Checkout failed", error: error.message })
  }
}

// Helper function to process wallet-only payments
const processWalletOnlyPayment = async (paymentHistory, res) => {
  try {
    // Deduct from wallet
    const wallet = await Wallet.findOne({ user: paymentHistory.userId })
    if (!wallet) {
      return res.status(400).json({ message: "Wallet not found for user." })
    }
    // Additional security check: ensure wallet balance is sufficient for the amount recorded as used
    if (wallet.balance < paymentHistory.walletUsed) {
      return res.status(400).json({ message: "Insufficient wallet balance" })
    }

    wallet.balance -= paymentHistory.walletUsed
    await wallet.save()

    // Mark payment as paid
    paymentHistory.status = "paid"
    await paymentHistory.save()

    // Process group buys FIRST
    const groupBuys = await processGroupBuys(paymentHistory)

    // Clear user's cart ONLY AFTER successful group buy processing
    await Cart.findOneAndUpdate({ user: paymentHistory.userId }, { items: [] })

    res.json({
      success: true,
      message: "Payment completed successfully using wallet",
      paymentId: paymentHistory._id,
      groupBuysJoined: groupBuys.length,
      walletUsed: paymentHistory.walletUsed,
      totalAmount: paymentHistory.amount,
    })
  } catch (error) {
    console.error("Wallet payment processing error:", error)
    res.status(500).json({ message: "Payment processing failed", error: error.message })
  }
}

// Helper function to process group buys after successful payment
const processGroupBuys = async (paymentHistory) => {
  const GroupBuy = (await import("../models/GroupBuy.js")).default
  const groupBuys = []

  for (const item of paymentHistory.cartItems) {
    // Check if there's an active group buy for this product
    let groupBuy = await GroupBuy.findOne({
      productId: item.productId,
      status: { $in: ["active", "successful"] },
      expiresAt: { $gt: new Date() },
    })

    if (!groupBuy) {
      // Create new group buy
      groupBuy = new GroupBuy({
        productId: item.productId,
        participants: [paymentHistory.userId],
        unitsSold: item.quantity,
        paymentHistories: [paymentHistory._id],
      })
    } else {
      // Join existing group buy
      groupBuy.addParticipant(paymentHistory.userId, item.quantity)
      groupBuy.paymentHistories.push(paymentHistory._id)
    }

    await groupBuy.save()
    groupBuys.push(groupBuy)

    // Emit WebSocket event for real-time updates
    const io = global.io
    if (io) {
      io.emit("groupBuyUpdate", {
        productId: item.productId,
        groupBuyId: groupBuy._id,
        unitsSold: groupBuy.unitsSold,
        status: groupBuy.status,
        participants: groupBuy.participants.length,
        minimumViableUnits: groupBuy.minimumViableUnits,
        progressPercentage: Math.round((groupBuy.unitsSold / groupBuy.minimumViableUnits) * 100),
      })
    }
  }

  // Update payment history with created group buys
  paymentHistory.groupBuysCreated = groupBuys.map((gb) => gb._id)
  await paymentHistory.save()

  return groupBuys
}

export { processGroupBuys }
