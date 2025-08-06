import crypto from "crypto"
import PaymentHistory from "../models/PaymentHistory.js"
import Wallet from "../models/Wallet.js"
import Cart from "../models/cart.js"
import Transaction from "../models/Transaction.js"
import { processGroupBuys } from "./checkoutController.js"
import logger from "../utils/logger.js"

// Paystack webhook handler
export const handlePaystackWebhook = async (req, res) => {
  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex")

    if (hash !== req.headers["x-paystack-signature"]) {
      logger.warn("Invalid Paystack webhook signature")
      return res.status(400).json({ message: "Invalid signature" })
    }

    const event = req.body

    if (event.event === "charge.success") {
      await handleSuccessfulCharge(event.data)
    } else if (event.event === "charge.failed") {
      await handleFailedCharge(event.data)
    }

    res.status(200).json({ message: "Webhook processed successfully" })
  } catch (error) {
    logger.error("Paystack webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

const handleSuccessfulCharge = async (data) => {
  try {
    const { reference, amount, status, metadata } = data

    // Find payment history by reference
    const paymentHistory = await PaymentHistory.findOne({ referenceId: reference })
    if (!paymentHistory) {
      logger.error(`Payment history not found for reference: ${reference}`)
      return
    }

    if (paymentHistory.status === "paid") {
      logger.info(`Payment ${reference} already processed`)
      return
    }

    // Verify amount matches
    const expectedAmount = Math.round(paymentHistory.paystackAmount * 100) // Convert to kobo
    if (amount !== expectedAmount) {
      logger.error(`Amount mismatch for ${reference}. Expected: ${expectedAmount}, Received: ${amount}`)
      return
    }

    // Process wallet deduction if applicable
    if (paymentHistory.walletUsed > 0) {
      const wallet = await Wallet.findOne({ user: paymentHistory.userId })
      if (!wallet || wallet.balance < paymentHistory.walletUsed) {
        logger.error(`Insufficient wallet balance for user ${paymentHistory.userId}`)
        return
      }

      wallet.balance -= paymentHistory.walletUsed
      await wallet.save()

      // Create wallet transaction record
      await Transaction.create({
        wallet: wallet._id,
        type: "debit",
        amount: paymentHistory.walletUsed,
        reason: "ORDER",
        description: `Wallet payment for order ${reference}`,
      })
    }

    // Mark payment as paid
    paymentHistory.status = "paid"
    paymentHistory.paystackData = data
    await paymentHistory.save()

    // Process group buys
    const groupBuys = await processGroupBuys(paymentHistory)

    // Clear user's cart
    await Cart.findOneAndUpdate({ user: paymentHistory.userId }, { items: [] })

    logger.info(`Payment ${reference} processed successfully. Group buys created: ${groupBuys.length}`)

    // Emit WebSocket event
    const io = global.io
    if (io) {
      io.to(`user_${paymentHistory.userId}`).emit("paymentSuccess", {
        reference,
        amount: paymentHistory.amount,
        groupBuysJoined: groupBuys.length,
      })
    }
  } catch (error) {
    logger.error("Error handling successful charge:", error)
  }
}

const handleFailedCharge = async (data) => {
  try {
    const { reference } = data

    const paymentHistory = await PaymentHistory.findOne({ referenceId: reference })
    if (!paymentHistory) {
      logger.error(`Payment history not found for failed charge: ${reference}`)
      return
    }

    paymentHistory.status = "failed"
    paymentHistory.paystackData = data
    await paymentHistory.save()

    logger.info(`Payment ${reference} marked as failed`)

    // Emit WebSocket event
    const io = global.io
    if (io) {
      io.to(`user_${paymentHistory.userId}`).emit("paymentFailed", {
        reference,
        message: "Payment failed. Please try again.",
      })
    }
  } catch (error) {
    logger.error("Error handling failed charge:", error)
  }
}

// Generic webhook handler for multiple payment providers
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"]
    const provider = req.headers["x-webhook-provider"] || "paystack"

    // Verify webhook signature
    const isValid = verifyWebhookSignature(req.body, signature, provider)

    if (!isValid) {
      return res.status(400).json({ message: "Invalid webhook signature" })
    }

    const event = req.body

    switch (provider) {
      case "paystack":
        await handlePaystackWebhook(event)
        break
      case "flutterwave":
        await handleFlutterwaveWebhook(event)
        break
      case "stripe":
        await handleStripeWebhook(event)
        break
      default:
        logger.warn(`Unknown webhook provider: ${provider}`)
    }

    res.status(200).json({ message: "Webhook processed successfully" })
  } catch (error) {
    logger.error("Webhook processing error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

const verifyWebhookSignature = (payload, signature, provider) => {
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`]
  const hash = crypto.createHmac("sha512", secret).update(JSON.stringify(payload)).digest("hex")

  return hash === signature
}

const handleFlutterwaveWebhook = async (event) => {
  if (event.event === "charge.completed") {
    const { tx_ref, meta } = event.data
    await updateOrderPaymentStatus(meta.orderId, "paid", tx_ref)
  }
}

const handleStripeWebhook = async (event) => {
  // Placeholder for Stripe webhook handling logic
  // This should be implemented based on Stripe's webhook events
}

const updateOrderPaymentStatus = async (orderId, status, reference) => {
  try {
    const Order = (await import("../models/order.js")).default
    const order = await Order.findById(orderId)
    if (order && order.paymentStatus !== "paid") {
      order.paymentStatus = status
      order.paymentReference = reference
      order.progress.push({
        status: "payment_confirmed",
        message: "Payment confirmed via webhook",
        timestamp: new Date(),
      })
      await order.save()

      logger.info(`Payment confirmed for order ${orderId} via webhook`)
    }
  } catch (error) {
    logger.error(`Error updating order ${orderId}:`, error)
  }
}
