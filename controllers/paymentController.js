import Order from "../models/order.js"
import Cart from "../models/cart.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import GroupBuy from "../models/GroupBuy.js"
import { generateTrackingNumber } from "../utils/trackingGenerator.js"
import crypto from "crypto"

// Helper function to process group buys after successful payment
// Moved here from checkoutController.js to be accessible by paymentController
const processGroupBuys = async (paymentHistoryOrOrder) => {
  const groupBuys = []
  const userId = paymentHistoryOrOrder.userId || paymentHistoryOrOrder.user // Handle both PaymentHistory and Order objects
  const cartItems = paymentHistoryOrOrder.cartItems || paymentHistoryOrOrder.items

  for (const item of cartItems) {
    // Check if there's an active group buy for this product
    let groupBuy = await GroupBuy.findOne({
      productId: item.product, // Use item.product for Order, item.productId for PaymentHistory
      status: { $in: ["forming", "secured"] },
      expiresAt: { $gt: new Date() },
    })

    if (!groupBuy) {
      // Create new group buy
      groupBuy = new GroupBuy({
        productId: item.product,
        participants: [userId],
        unitsSold: item.quantity,
        paymentHistories: [paymentHistoryOrOrder._id], // Link to the order/payment history
      })
    } else {
      // Join existing group buy
      groupBuy.addParticipant(userId, item.quantity)
      groupBuy.paymentHistories.push(paymentHistoryOrOrder._id)
    }

    await groupBuy.save()
    groupBuys.push(groupBuy)

    // Emit WebSocket event for real-time updates
    const io = global.io
    if (io) {
      io.emit("groupBuyUpdate", {
        productId: item.product,
        groupBuyId: groupBuy._id,
        unitsSold: groupBuy.unitsSold,
        status: groupBuy.status,
        participants: groupBuy.participants.length,
        minimumViableUnits: groupBuy.minimumViableUnits,
        progressPercentage: Math.round((groupBuy.unitsSold / groupBuy.minimumViableUnits) * 100),
      })
    }
  }

  // If it's an Order object, update its groupBuysCreated field
  if (paymentHistoryOrOrder.groupBuysCreated) {
    paymentHistoryOrOrder.groupBuysCreated = groupBuys.map((gb) => gb._id)
    await paymentHistoryOrOrder.save()
  }

  return groupBuys
}

export const initializePayment = async (req, res) => {
  try {
    // Removed walletAmount from req.body. Backend will determine usable wallet amount.
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

    let subtotal = 0
    const processedItems = []

    for (const item of cart.items) {
      const product = item.product
      const quantity = item.quantity

      if (!product) {
        return res.status(400).json({ message: "Invalid product in cart" })
      }

      if (product.stock < quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.title}` })
      }

      // Determine the item price, prioritizing basePrice if valid, otherwise falling back to product.price
      const itemPrice = product.basePrice != null && product.basePrice > 0 ? product.basePrice : product.price
      const itemTotal = itemPrice * quantity // Use the determined itemPrice

      subtotal += itemTotal

      processedItems.push({
        product: product._id,
        quantity: quantity,
        variant: item.variant || null,
        price: itemPrice, // Use the determined itemPrice
        // groupbuyId and groupStatus will be determined after payment if applicable
      })
    }

    // Placeholder for delivery fee calculation.
    // In a real scenario, this would depend on the delivery address and possibly region.
    const deliveryFee = 1000 // Example fixed delivery fee
    const totalAmount = subtotal + deliveryFee

    const wallet = await Wallet.findOne({ user: userId })
    let walletUsed = 0
    let amountToPay = totalAmount

    if (useWallet && wallet && wallet.balance > 0) {
      // CRITICAL SECURITY FIX: Calculate walletUsed based ONLY on backend wallet balance and totalAmount
      walletUsed = Math.min(wallet.balance, totalAmount)
      amountToPay = totalAmount - walletUsed
    }

    const order = new Order({
      user: userId,
      items: processedItems,
      subtotal,
      deliveryFee,
      totalAmount,
      walletUsed,
      amountToPay,
      deliveryAddress: {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        phone: phone,
      },
      currentStatus: amountToPay > 0 ? "payment_pending" : "groups_forming",
      progress: [
        {
          status: amountToPay > 0 ? "payment_pending" : "groups_forming",
          message: amountToPay > 0 ? "Order created. Awaiting payment." : "Order created. Groups are forming.",
          timestamp: new Date(),
        },
      ],
      paymentStatus: amountToPay > 0 ? "pending" : "paid", // If amountToPay is 0, it's considered paid by wallet
      paymentMethod: amountToPay > 0 ? "card" : "wallet",
      trackingNumber: generateTrackingNumber(),
    })

    await order.save()

    // If amountToPay is 0 (fully paid by wallet), process immediately
    if (amountToPay === 0) {
      // Deduct from wallet
      if (wallet) {
        // Ensure wallet exists before deducting
        wallet.balance -= walletUsed
        await wallet.save()

        await Transaction.create({
          wallet: wallet._id,
          type: "debit",
          amount: walletUsed,
          reason: "ORDER_PAYMENT",
          description: `Wallet used for order ${order.trackingNumber} payment`,
          user: userId, // Link transaction to user
        })
      }

      // Process group buys and clear cart
      await processGroupBuys(order) // Pass the order object
      await Cart.findByIdAndDelete(cartId)

      return res.status(200).json({
        success: true,
        message: "Order placed successfully using wallet!",
        orderId: order._id,
        reference: order.paymentReference, // This might be null if no Paystack
        amount: amountToPay,
        walletUsed: walletUsed,
        totalAmount: totalAmount,
      })
    }

    // Initialize Paystack payment for remaining amount
    const paystackData = {
      email: req.user.email || "customer@grup.com",
      amount: Math.round(order.amountToPay * 100),
      reference: `grup_${order._id}_${Date.now()}`,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        walletUsed: order.walletUsed,
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
      order.paymentReference = data.data.reference
      order.paystackAuthorizationUrl = data.data.authorization_url // Store auth URL
      await order.save()
      await Cart.findByIdAndDelete(cartId)

      res.status(200).json({
        success: true,
        paymentUrl: data.data.authorization_url,
        reference: data.data.reference,
        orderId: order._id,
        message: "Payment initialized successfully. Cart has been cleared.",
      })
    } else {
      await Order.findByIdAndDelete(order._id) // Clean up order if Paystack init fails
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
      const orderId = metadata.orderId

      const order = await Order.findById(orderId)
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid"
        order.paymentReference = reference
        order.currentStatus = "processing" // Or 'groups_forming' if group buy is primary
        order.progress.push({
          status: "payment_confirmed",
          message: "Payment confirmed via webhook",
          timestamp: new Date(),
        })
        await order.save()

        const wallet = await Wallet.findOne({ user: order.user })
        if (wallet && order.walletUsed > 0) {
          wallet.balance -= order.walletUsed
          await wallet.save()

          await Transaction.create({
            wallet: wallet._id,
            type: "debit",
            amount: order.walletUsed,
            reason: "ORDER_PAYMENT",
            description: `Wallet used for order ${order.trackingNumber} payment`,
            user: order.user, // Link transaction to user
          })
        }

        // Process group buys after successful payment
        await processGroupBuys(order)

        console.log(`Payment confirmed for order ${orderId} via webhook`)
      }
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("Webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}
