import Cart from "../models/cart.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import GroupBuy from "../models/GroupBuy.js"
import PaymentHistory from "../models/PaymentHistory.js"
import Order from "../models/order.js"
import { generateTrackingNumber } from "../utils/trackingGenerator.js"
import crypto from "crypto"
import logger from "../utils/logger.js"

// Helper function to create order after successful payment
const createOrderFromPayment = async (paymentHistory) => {
  try {
    console.log(`Creating order for PaymentHistory: ${paymentHistory._id}`)

    const trackingNumber = generateTrackingNumber()

    // Convert PaymentHistory cartItems to Order items format
    const orderItems = paymentHistory.cartItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
      groupbuyId: null, // Will be populated when GroupBuys are linked
      groupStatus: "forming",
    }))

    const order = new Order({
      trackingNumber,
      paymentHistoryId: paymentHistory._id,
      user: paymentHistory.userId,
      items: orderItems,
      currentStatus: "groups_forming",
      deliveryAddress: paymentHistory.metadata?.deliveryAddress || {},
      phone: paymentHistory.metadata?.phone,
      totalAmount: paymentHistory.amount,
      walletUsed: paymentHistory.walletUsed,
      paystackAmount: paymentHistory.paystackAmount,
      progress: [
        {
          status: "groups_forming",
          message: "Order created successfully. Groups are forming for your items.",
          timestamp: new Date(),
        },
      ],
    })

    await order.save()

    // Update PaymentHistory with order reference
    paymentHistory.orderId = order._id
    await paymentHistory.save()

    console.log(`✅ Order created: ${trackingNumber} for PaymentHistory: ${paymentHistory._id}`)
    return order
  } catch (error) {
    console.error("❌ Error creating order from payment:", error)
    throw error
  }
}

// Helper function to link order items to group buys
const linkOrderToGroupBuys = async (order, paymentHistory) => {
  try {
    console.log(`Linking order ${order.trackingNumber} to ${paymentHistory.groupBuysCreated.length} GroupBuys`)

    const groupBuysCreated = []

    for (const item of order.items) {
      console.log(`Processing item: ${item.product}`)

      // Find or create group buy for this product
      let groupBuy = await GroupBuy.findOne({
        productId: item.product,
        status: { $in: ["active", "successful"] },
        expiresAt: { $gt: new Date() },
      })

      if (!groupBuy) {
        console.log(`Creating new group buy for product: ${item.product}`)

        groupBuy = new GroupBuy({
          productId: item.product,
          minimumViableUnits: 20,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
        })
        await groupBuy.save()
        console.log(`✅ New group buy created: ${groupBuy._id}`)
      }

      // Add participant and update units
      await groupBuy.addParticipant(paymentHistory.userId, item.quantity)
      console.log(`👥 Added participant to group buy: ${groupBuy._id}`)

      groupBuysCreated.push(groupBuy._id)

      // Update order item with group buy info
      const orderItem = order.items.find((orderItem) => orderItem.product.toString() === item.product.toString())
      if (orderItem) {
        orderItem.groupbuyId = groupBuy._id
        orderItem.groupStatus = groupBuy.status
      }
    }

    // Update payment history with group buys
    paymentHistory.groupBuysCreated = groupBuysCreated
    await paymentHistory.save()

    // Save order with updated group buy info
    await order.save()

    console.log(`✅ Order linked to ${groupBuysCreated.length} group buys`)

    // Emit WebSocket events
    const io = global.io
    if (io) {
      groupBuysCreated.forEach((groupBuyId) => {
        io.emit("groupBuyUpdate", {
          groupBuyId,
          message: "New participant joined!",
        })
      })
    }
  } catch (error) {
    console.error("❌ Group buy linking error:", error)
    logger.error("Group buy linking error:", error)
    throw error
  }
}

// Helper function to process group buys after successful payment
const processGroupBuys = async (paymentHistory) => {
  const groupBuys = []
  console.log(`Processing GroupBuys for PaymentHistory: ${paymentHistory._id}`)

  for (const item of paymentHistory.cartItems) {
    console.log(`Processing item: Product ${item.productId}, Quantity: ${item.quantity}`)

    // Check if there's an active group buy for this product
    let groupBuy = await GroupBuy.findOne({
      productId: item.productId,
      status: { $in: ["active", "successful"] },
      expiresAt: { $gt: new Date() },
    })

    if (!groupBuy) {
      // Create new group buy
      console.log(`Creating new GroupBuy for product: ${item.productId}`)
      groupBuy = new GroupBuy({
        productId: item.productId,
        participants: [paymentHistory.userId],
        unitsSold: item.quantity,
        paymentHistories: [paymentHistory._id],
      })
    } else {
      // Join existing group buy
      console.log(`Joining existing GroupBuy: ${groupBuy._id}`)
      groupBuy.addParticipant(paymentHistory.userId, item.quantity)
      groupBuy.paymentHistories.push(paymentHistory._id)
    }

    await groupBuy.save()
    groupBuys.push(groupBuy)

    console.log(`✅ GroupBuy processed: ${groupBuy._id}, Status: ${groupBuy.status}, Units: ${groupBuy.unitsSold}`)

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

  console.log(`✅ Processed ${groupBuys.length} GroupBuys for PaymentHistory: ${paymentHistory._id}`)
  return groupBuys
}

// Helper function to process wallet-only payments
const processWalletOnlyPayment = async (paymentHistory, res) => {
  try {
    console.log(`Processing wallet-only payment for PaymentHistory: ${paymentHistory._id}`)

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

    // Create wallet transaction record
    await Transaction.create({
      wallet: wallet._id,
      type: "debit",
      amount: paymentHistory.walletUsed,
      reason: "ORDER_PAYMENT",
      description: `Wallet used for payment ${paymentHistory.referenceId}`,
      user: paymentHistory.userId,
    })

    // Mark payment as paid
    paymentHistory.status = "paid"
    await paymentHistory.save()

    // Process group buys FIRST
    const groupBuys = await processGroupBuys(paymentHistory)

    // Create Order AFTER group buys are processed
    const order = await createOrderFromPayment(paymentHistory)

    // Link order to group buys
    await linkOrderToGroupBuys(order, paymentHistory)

    // Clear user's cart ONLY AFTER successful order creation
    await Cart.findOneAndUpdate({ user: paymentHistory.userId }, { items: [] })

    console.log(`✅ Wallet-only payment completed for ${order.trackingNumber}`)

    res.json({
      success: true,
      message: "Payment completed successfully using wallet",
      paymentHistoryId: paymentHistory._id,
      orderId: order._id,
      trackingNumber: order.trackingNumber,
      groupBuysJoined: groupBuys.length,
      walletUsed: paymentHistory.walletUsed,
      totalAmount: paymentHistory.amount,
    })
  } catch (error) {
    console.error("❌ Wallet payment processing error:", error)
    logger.error("Wallet payment processing error:", error)
    res.status(500).json({ message: "Payment processing failed", error: error.message })
  }
}

export const initializePayment = async (req, res) => {
  try {
    const { cartId, deliveryAddress, phone, useWallet = false } = req.body
    const userId = req.user.id

    console.log(`🚀 Payment initialization started for user: ${userId}`)

    // Get cart
    const cart = await Cart.findById(cartId).populate("items.productId")
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty or not found" })
    }

    console.log(`📦 Cart found with ${cart.items.length} items`)

    // Calculate total amount
    let totalAmount = 0
    const cartItems = []

    for (const item of cart.items) {
      const product = item.productId
      if (!product) {
        return res.status(400).json({ message: `Product not found for item ${item._id}` })
      }

      const itemTotal = product.price * item.quantity
      totalAmount += itemTotal

      cartItems.push({
        productId: product._id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
      })
    }

    console.log(`💰 Total amount calculated: ₦${totalAmount}`)

    // Handle wallet usage
    let walletUsed = 0
    let paystackAmount = totalAmount

    if (useWallet) {
      const wallet = await Wallet.findOne({ userId })
      if (wallet && wallet.balance > 0) {
        walletUsed = Math.min(wallet.balance, totalAmount)
        paystackAmount = totalAmount - walletUsed
        console.log(`💳 Wallet usage: ₦${walletUsed}, Remaining: ₦${paystackAmount}`)
      }
    }

    // Generate reference ID
    const referenceId = `GRP_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    console.log(`🔗 Generated reference: ${referenceId}`)

    // Create payment history
    const paymentHistory = new PaymentHistory({
      userId,
      referenceId,
      amount: totalAmount,
      walletUsed,
      paystackAmount,
      cartItems,
      metadata: {
        deliveryAddress,
        phone,
        cartId,
      },
      status: paystackAmount === 0 ? "paid" : "pending",
    })

    await paymentHistory.save()
    console.log(`📝 PaymentHistory created: ${paymentHistory._id}`)

    // If wallet covers full amount, process immediately
    if (paystackAmount === 0) {
      console.log(`✅ Full wallet payment - processing immediately`)

      // Deduct from wallet
      if (walletUsed > 0) {
        await Wallet.findOneAndUpdate({ userId }, { $inc: { balance: -walletUsed } })
        console.log(`💳 Wallet deducted: ₦${walletUsed}`)
      }

      // Create order
      const order = await createOrderFromPayment(paymentHistory)
      console.log(`📦 Order created: ${order.trackingNumber}`)

      // Clear cart
      await Cart.findByIdAndDelete(cartId)
      console.log(`🗑️ Cart cleared`)

      return res.json({
        success: true,
        message: "Payment completed successfully using wallet",
        paymentHistoryId: paymentHistory._id,
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        groupBuysJoined: order.items.length,
        walletUsed,
        totalAmount,
      })
    }

    // Initialize Paystack payment
    const paystackData = {
      email: req.user.email,
      amount: Math.round(paystackAmount * 100), // ✅ FIXED: Convert naira to kobo
      reference: referenceId,
      metadata: {
        userId,
        paymentHistoryId: paymentHistory._id,
        deliveryAddress,
        phone,
      },
    }

    console.log(`💳 Initializing Paystack payment: ₦${paystackAmount} (${paystackData.amount} kobo)`)

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackData),
    })

    const paystackResult = await paystackResponse.json()

    if (!paystackResult.status) {
      console.error(`❌ Paystack initialization failed:`, paystackResult)
      return res.status(400).json({
        message: "Payment initialization failed",
        error: paystackResult.message,
      })
    }

    console.log(`✅ Paystack initialized successfully`)

    res.json({
      success: true,
      authorization_url: paystackResult.data.authorization_url,
      reference: referenceId,
      paymentHistoryId: paymentHistory._id,
      amount: paystackAmount,
      walletUsed,
      totalAmount,
      message: "Payment initialized successfully",
    })
  } catch (error) {
    console.error("❌ Payment initialization error:", error)
    logger.error("Payment initialization error:", error)
    res.status(500).json({ message: "Payment initialization failed", error: error.message })
  }
}

// Handle Paystack webhook
export const handlePaystackWebhook = async (req, res) => {
  try {
    console.log(`🔔 Paystack Webhook Received`)

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex")

    if (hash !== req.headers["x-paystack-signature"]) {
      console.log(`❌ Invalid webhook signature`)
      return res.status(400).json({ message: "Invalid signature" })
    }

    const { event, data } = req.body

    if (event === "charge.success") {
      console.log(`✅ Processing successful charge: ${data.reference}`)

      const paymentHistory = await PaymentHistory.findOne({
        referenceId: data.reference,
      })

      if (!paymentHistory) {
        console.log(`❌ PaymentHistory not found for reference: ${data.reference}`)
        return res.status(404).json({ message: "Payment history not found" })
      }

      console.log(`📝 Processing PaymentHistory: ${paymentHistory._id}`)

      if (paymentHistory.status === "paid") {
        console.log(`⚠️ Payment already processed`)
        return res.json({ message: "Payment already processed" })
      }

      // Update payment status
      paymentHistory.status = "paid"
      paymentHistory.paystackReference = data.reference
      await paymentHistory.save()

      console.log(`✅ PaymentHistory marked as paid`)

      // Deduct wallet if used
      if (paymentHistory.walletUsed > 0) {
        await Wallet.findOneAndUpdate(
          { userId: paymentHistory.userId },
          { $inc: { balance: -paymentHistory.walletUsed } },
        )
        console.log(`💳 Wallet deducted: ₦${paymentHistory.walletUsed}`)
      }

      // Create order
      const order = await createOrderFromPayment(paymentHistory)
      console.log(`📦 Order created: ${order.trackingNumber}`)

      // Clear cart
      if (paymentHistory.metadata?.cartId) {
        await Cart.findByIdAndDelete(paymentHistory.metadata.cartId)
        console.log(`🗑️ Cart cleared`)
      }

      console.log(`🎉 Payment processing completed successfully`)
    }

    res.json({ message: "Webhook processed" })
  } catch (error) {
    console.error("❌ Webhook processing error:", error)
    logger.error("Webhook processing error:", error)
    res.status(500).json({ message: "Webhook processing failed", error: error.message })
  }
}

// Verify payment
export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params

    const paymentHistory = await PaymentHistory.findOne({ referenceId: reference })
    if (!paymentHistory) {
      return res.status(404).json({ message: "Payment not found" })
    }

    // Verify with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    const paystackResult = await paystackResponse.json()

    res.json({
      success: true,
      data: {
        paymentHistory,
        paystackVerification: paystackResult,
      },
    })
  } catch (error) {
    logger.error("Payment verification error:", error)
    res.status(500).json({ message: "Payment verification failed", error: error.message })
  }
}

// Get user's payment history
export const getUserPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10 } = req.query

    const payments = await PaymentHistory.find({ userId })
      .populate("orderId", "trackingNumber currentStatus")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await PaymentHistory.countDocuments({ userId })

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Get payment history error:", error)
    res.status(500).json({ message: "Error fetching payment history", error: error.message })
  }
}
