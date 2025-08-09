import Cart from "../models/cart.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import GroupBuy from "../models/GroupBuy.js"
import PaymentHistory from "../models/PaymentHistory.js"
import Order from "../models/order.js"
import { generateTrackingNumber } from "../utils/trackingGenerator.js"
import crypto from "crypto"
import { nanoid } from "nanoid"

// Helper function to create order after successful payment
const createOrderFromPayment = async (paymentHistory) => {
  try {
    const trackingNumber = generateTrackingNumber()

    // Convert PaymentHistory cartItems to Order items format
    const orderItems = paymentHistory.cartItems.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.price,
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

    console.log(`Order created: ${trackingNumber} for PaymentHistory: ${paymentHistory._id}`)
    return order
  } catch (error) {
    console.error("Error creating order from payment:", error)
    throw error
  }
}

// Helper function to link order items to group buys
const linkOrderToGroupBuys = async (order, groupBuys) => {
  try {
    // Create a map of productId to groupBuy for quick lookup
    const productGroupBuyMap = {}
    groupBuys.forEach((gb) => {
      productGroupBuyMap[gb.productId.toString()] = gb
    })

    // Update order items with groupBuy references
    let orderUpdated = false
    order.items.forEach((item) => {
      const productId = item.product.toString()
      if (productGroupBuyMap[productId]) {
        item.groupbuyId = productGroupBuyMap[productId]._id
        item.groupStatus = productGroupBuyMap[productId].status === "successful" ? "secured" : "forming"
        orderUpdated = true
      }
    })

    if (orderUpdated) {
      order.checkAllGroupsSecured()
      order.calculatePriorityScore()
      await order.save()
      console.log(`Order ${order.trackingNumber} linked to GroupBuys`)
    }
  } catch (error) {
    console.error("Error linking order to group buys:", error)
  }
}

// Helper function to process group buys after successful payment
const processGroupBuys = async (paymentHistory) => {
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
    await linkOrderToGroupBuys(order, groupBuys)

    // Clear user's cart ONLY AFTER successful order creation
    await Cart.findOneAndUpdate({ user: paymentHistory.userId }, { items: [] })

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
    console.error("Wallet payment processing error:", error)
    res.status(500).json({ message: "Payment processing failed", error: error.message })
  }
}

export const initializePayment = async (req, res) => {
  try {
    const { deliveryAddress, phone, useWallet, cartId } = req.body
    const userId = req.user.id

    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !phone) {
      return res.status(400).json({ message: "Delivery address (street, city, state) and phone number are required" })
    }

    const cart = await Cart.findById(cartId).populate("items.product")
    if (!cart || cart.user.toString() !== userId) {
      return res.status(404).json({ message: "Cart not found or does not belong to user" })
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cannot checkout with an empty cart" })
    }

    let totalPrice = 0
    const cartItems = []

    for (const item of cart.items) {
      const product = item.product
      const quantity = item.quantity

      if (!product) {
        return res.status(400).json({ message: "Invalid product in cart" })
      }

      if (product.stock < quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.title}` })
      }

      // Use product.price (no delivery fees)
      const itemPrice = product.price
      const itemTotal = itemPrice * quantity

      totalPrice += itemTotal

      cartItems.push({
        productId: product._id,
        quantity: quantity,
        price: itemPrice,
      })
    }

    // Handle wallet offset
    let walletUsed = 0
    let paystackAmount = totalPrice

    if (useWallet) {
      const wallet = await Wallet.findOne({ user: userId })
      if (wallet && wallet.balance > 0) {
        walletUsed = Math.min(wallet.balance, totalPrice)
        paystackAmount = totalPrice - walletUsed
      }
    }

    // Generate unique reference (same format as checkout)
    const referenceId = `GRP_${nanoid(10)}_${Date.now()}`

    // Create PaymentHistory (not Order)
    const paymentHistory = new PaymentHistory({
      userId,
      referenceId,
      cartItems,
      amount: totalPrice,
      walletUsed,
      paystackAmount,
      status: "pending",
      // Store delivery info in metadata
      metadata: {
        deliveryAddress: {
          street: deliveryAddress.street,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          phone: phone,
        },
      },
    })

    await paymentHistory.save()

    // If no Paystack payment needed (fully paid by wallet)
    if (paystackAmount === 0) {
      // Process payment immediately using existing wallet-only logic
      return await processWalletOnlyPayment(paymentHistory, res)
    }

    // Initialize Paystack payment
    const paystackData = {
      email: req.user.email || "customer@grup.com",
      amount: Math.round(paystackAmount * 100), // No * 100 (already fixed)
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

      // Clear cart after successful payment initialization
      await Cart.findByIdAndDelete(cartId)

      res.status(200).json({
        success: true,
        authorization_url: data.data.authorization_url,
        reference: referenceId,
        paymentHistoryId: paymentHistory._id,
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
    console.error("Payment initialization error:", error)
    res.status(500).json({ message: "Error initializing payment", error: error.message })
  }
}

export const handlePaystackWebhook = async (req, res) => {
  try {
    const event = req.body

    console.log("--- Paystack Webhook Debug ---")
    console.log("Raw Body String for Hashing:", JSON.stringify(req.body))
    console.log("Received Signature:", req.headers["x-paystack-signature"])
    console.log(
      "Expected Secret Key (first 5 chars):",
      process.env.PAYSTACK_SECRET_KEY ? process.env.PAYSTACK_SECRET_KEY.substring(0, 5) + "..." : "NOT SET",
    )
    console.log("--- End Debug ---")

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex")

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).json({ message: "Invalid signature" })
    }

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data

      // Find PaymentHistory by reference (not Order)
      const paymentHistory = await PaymentHistory.findOne({ referenceId: reference })

      if (paymentHistory && paymentHistory.status !== "paid") {
        paymentHistory.status = "paid"
        paymentHistory.paystackReference = reference
        await paymentHistory.save()

        // Handle wallet deduction if applicable
        if (paymentHistory.walletUsed > 0) {
          const wallet = await Wallet.findOne({ user: paymentHistory.userId })
          if (wallet) {
            wallet.balance -= paymentHistory.walletUsed
            await wallet.save()

            await Transaction.create({
              wallet: wallet._id,
              type: "debit",
              amount: paymentHistory.walletUsed,
              reason: "ORDER_PAYMENT",
              description: `Wallet used for payment ${paymentHistory.referenceId}`,
              user: paymentHistory.userId,
            })
          }
        }

        // Process group buys after successful payment
        const groupBuys = await processGroupBuys(paymentHistory)

        // Create Order AFTER payment confirmation
        const order = await createOrderFromPayment(paymentHistory)

        // Link order to group buys
        await linkOrderToGroupBuys(order, groupBuys)

        console.log(`Payment confirmed for PaymentHistory ${paymentHistory._id} via webhook`)
        console.log(`Order created: ${order.trackingNumber}`)
      }
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("Webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}
