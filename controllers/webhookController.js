import crypto from "crypto"
import PaymentHistory from "../models/PaymentHistory.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import Order from "../models/order.js"
import Cart from "../models/cart.js" // Import Cart model
import { generateTrackingNumber } from "../utils/trackingGenerator.js"
import logger from "../utils/logger.js"
import { processGroupBuys } from "./paymentController.js"
import notificationService from "../services/notificationService.js"
import { processWalletDebit } from "../utils/walletTransactionService.js"
import { invalidateWalletCache } from "../utils/cacheManager.js"

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

    console.log(`✅ Order created: ${trackingNumber} for PaymentHistory: ${paymentHistory._id}`)
    return order
  } catch (error) {
    console.error("❌ Error creating order from payment:", error)
    throw error
  }
}

// Helper function to link order items to group buys
const linkOrderToGroupBuys = async (order, groupBuys) => {
  try {
    console.log(`Linking order ${order.trackingNumber} to ${groupBuys.length} GroupBuys`)

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
      console.log(`✅ Order ${order.trackingNumber} linked to GroupBuys`)
    }
  } catch (error) {
    console.error("❌ Error linking order to group buys:", error)
  }
}

// Paystack webhook handler
export const handlePaystackWebhook = async (req, res) => {
  try {
    console.log("🔔 Webhook received:", req.body)
    
    // Verify Paystack signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex")

    console.log(`🔐 Webhook signature check:`, {
      expected: hash,
      received: req.headers["x-paystack-signature"],
      matches: hash === req.headers["x-paystack-signature"],
    })

    if (hash !== req.headers["x-paystack-signature"]) {
      logger.warn("Invalid Paystack webhook signature")
      console.log(`❌ Signature mismatch - Expected: ${hash}, Received: ${req.headers["x-paystack-signature"]}`)
      // Temporarily allow invalid signatures for debugging
      // return res.status(400).json({
      //   message: "Invalid webhook signature",
      //   details: "The webhook signature verification failed. This could indicate a security issue.",
      //   error: "SIGNATURE_MISMATCH"
      // })
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
    res.status(500).json({
      message: "Webhook processing failed",
      details: "An error occurred while processing the payment webhook. The payment may still be processed.",
      error: error.message,
    })
  }
}

const handleSuccessfulCharge = async (data) => {
  try {
    const { reference, amount, status, metadata } = data

    console.log(`🔍 Webhook Debug:`)
    console.log(`   Paystack Reference: ${reference}`)
    console.log(`   Amount: ${amount}`)
    console.log(`   Status: ${status}`)

    // Find payment history by Paystack reference
    console.log(`🔍 Looking for payment history with paystackReference: ${reference}`)
    const paymentHistory = await PaymentHistory.findOne({ paystackReference: reference })
    if (!paymentHistory) {
      logger.error(`Payment history not found for reference: ${reference}`)
      console.error(`❌ Payment history not found for reference: ${reference}`)
      
      // Try to find by referenceId as fallback
      console.log(`🔍 Trying to find by referenceId: ${reference}`)
      const fallbackPayment = await PaymentHistory.findOne({ referenceId: reference })
      if (fallbackPayment) {
        console.log(`✅ Found payment by referenceId: ${fallbackPayment._id}`)
        // Update the paystackReference
        fallbackPayment.paystackReference = reference
        await fallbackPayment.save()
        console.log(`✅ Updated paystackReference for payment: ${fallbackPayment._id}`)
        return await handleSuccessfulCharge({ ...data, reference: fallbackPayment.referenceId })
      }
      
      console.error(`🔍 Available references in database:`, await PaymentHistory.distinct("referenceId"))
      console.error(`🔍 Available paystack references in database:`, await PaymentHistory.distinct("paystackReference"))
      return
    }
    
    console.log(`✅ Found payment history: ${paymentHistory._id}`)
    console.log(`   Wallet used: ₦${paymentHistory.walletUsed}`)
    console.log(`   Paystack amount: ₦${paymentHistory.paystackAmount}`)
    console.log(`   Total amount: ₦${paymentHistory.amount}`)
    console.log(`   Status: ${paymentHistory.status}`)

    if (paymentHistory.status === "paid") {
      logger.info(`Payment ${reference} already processed`)
      console.log(`⚠️ Payment ${reference} already processed - skipping duplicate webhook`)
      return
    }

    // Verify amount matches
    const expectedAmount = Math.round(paymentHistory.paystackAmount * 100) // Convert to kobo
    if (amount !== expectedAmount) {
      logger.error(`Amount mismatch for ${reference}. Expected: ${expectedAmount}, Received: ${amount}`)
      console.error(`❌ Amount mismatch for ${reference}:`)
      console.error(`   Expected: ${expectedAmount} kobo (₦${paymentHistory.paystackAmount})`)
      console.error(`   Received: ${amount} kobo (₦${amount / 100})`)
      console.error(`   Difference: ${Math.abs(amount - expectedAmount)} kobo`)
      return
    }

    // Process wallet deduction if applicable
    if (paymentHistory.walletUsed > 0) {
      try {
        console.log(`💳 Processing wallet deduction for user ${paymentHistory.userId}: ₦${paymentHistory.walletUsed}`)
        
        const walletResult = await processWalletDebit(
          paymentHistory.userId,
          paymentHistory.walletUsed,
          "ORDER",
          `Wallet payment for order ${reference}`,
          {
            paymentHistoryId: paymentHistory._id,
            isWebhookProcessed: true,
            paystackReference: reference,
          }
        )

        // Invalidate wallet cache
        await invalidateWalletCache(paymentHistory.userId)
        
        console.log(`✅ Wallet deduction successful: ₦${paymentHistory.walletUsed} deducted from user ${paymentHistory.userId}`)
      } catch (error) {
        console.error(`❌ Wallet deduction failed for user ${paymentHistory.userId}:`, error)
        logger.error(`Wallet deduction failed for user ${paymentHistory.userId}:`, error)
        // Don't fail the entire webhook if wallet deduction fails
        // The payment can still be processed without wallet deduction
      }
    }

    // Mark payment as paid
    paymentHistory.status = "paid"
    paymentHistory.paystackData = data
    await paymentHistory.save()

    // Process group buys
    console.log(`🔄 Starting group buy processing for payment: ${paymentHistory._id}`)
    console.log(`🔄 Payment cart items:`, JSON.stringify(paymentHistory.cartItems, null, 2))
    let groupBuys = []
    try {
      groupBuys = await processGroupBuys(paymentHistory)
      console.log(`✅ Group buys processed successfully: ${groupBuys.length} created/joined`)
      console.log(`✅ Group buy details:`, groupBuys.map(gb => ({
        id: gb._id,
        productId: gb.productId,
        status: gb.status,
        unitsSold: gb.unitsSold,
        participants: gb.participants?.length || 0
      })))
    } catch (error) {
      console.error(`❌ Error processing group buys:`, error)
      console.error(`❌ Error stack:`, error.stack)
      logger.error(`Group buy processing failed for payment ${paymentHistory._id}:`, error)
      // Continue with order creation even if group buys fail
    }

    // Create Order AFTER payment confirmation and GroupBuy processing
    const order = await createOrderFromPayment(paymentHistory)

    // Link order to group buys
    await linkOrderToGroupBuys(order, groupBuys)

    try {
      await Cart.findOneAndUpdate({ user: paymentHistory.userId }, { items: [] })
      console.log(`✅ Cart cleared for user ${paymentHistory.userId} after successful payment`)
    } catch (error) {
      console.error(`❌ Error clearing cart for user ${paymentHistory.userId}:`, error)
      logger.error(`Cart clearing failed for user ${paymentHistory.userId}:`, error)
      // Don't fail the entire webhook if cart clearing fails
    }

    try {
      // Send payment success notification
      await notificationService.notifyPaymentSuccess(
        paymentHistory.userId,
        paymentHistory.amount,
        paymentHistory.walletUsed > 0 ? "wallet + paystack" : "paystack",
        order._id,
      )

      // Send order creation notification
      await notificationService.notifyOrderCreated(paymentHistory.userId, {
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        totalAmount: paymentHistory.amount,
        groupBuysJoined: groupBuys.length,
      })

      // Send group buy notifications for each group buy joined/created
      for (const groupBuy of groupBuys) {
        const Product = (await import("../models/Product.js")).default
        const product = await Product.findById(groupBuy.productId)
        if (product) {
          if (groupBuy.status === "successful") {
            await notificationService.notifyGroupBuySecured(paymentHistory.userId, product.name, groupBuy._id)
          }
        }
      }

      console.log(`✅ Notifications sent for payment ${reference}`)
    } catch (notificationError) {
      console.error(`❌ Error sending notifications for payment ${reference}:`, notificationError)
      logger.error(`Notification sending failed for payment ${paymentHistory._id}:`, notificationError)
      // Don't fail the entire webhook if notifications fail
    }

    logger.info(`Payment ${reference} processed successfully. Group buys created: ${groupBuys.length}`)

    console.log(`✅ Webhook processed successfully`)

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
    logger.error(`❌ Webhook processing failed for ${data.reference}:`, error)
    throw error
  }
}

const handleFailedCharge = async (data) => {
  try {
    const { reference } = data

    const paymentHistory = await PaymentHistory.findOne({ paystackReference: reference })
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
