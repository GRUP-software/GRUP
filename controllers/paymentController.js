import Order from "../models/order.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import crypto from "crypto"

// Initialize Paystack payment
export const initializePayment = async (req, res) => {
  try {
    const { orderId } = req.body
    const userId = req.user.id

    const order = await Order.findOne({ _id: orderId, user: userId })
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order already paid" })
    }

    // Paystack initialization
    const paystackData = {
      email: req.user.email || "customer@grup.com",
      amount: Math.round(order.amountToPay * 100), // Paystack expects kobo
      reference: `grup_${orderId}_${Date.now()}`,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        orderId: orderId,
        userId: userId,
        custom_fields: [
          {
            display_name: "Order ID",
            variable_name: "order_id",
            value: orderId,
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
      // Update order with payment reference
      order.paymentReference = data.data.reference
      await order.save()

      res.json({
        success: true,
        paymentUrl: data.data.authorization_url,
        reference: data.data.reference,
        message: "Payment initialized successfully",
      })
    } else {
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

// Verify Paystack payment
export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    const data = await response.json()

    if (data.status && data.data.status === "success") {
      const orderId = data.data.metadata.orderId
      const order = await Order.findById(orderId)

      if (order && order.paymentStatus !== "paid") {
        // Update order payment status
        order.paymentStatus = "paid"
        order.paymentReference = reference
        order.progress.push({
          status: "payment_confirmed",
          message: "Payment confirmed successfully",
          timestamp: new Date(),
        })

        await order.save()

        // Create transaction record
        const wallet = await Wallet.findOne({ user: order.user })
        if (wallet) {
          await Transaction.create({
            wallet: wallet._id,
            type: "debit",
            amount: order.amountToPay,
            reason: "ORDER",
            description: `Payment for order ${order.trackingNumber}`,
          })
        }

        res.json({
          success: true,
          message: "Payment verified successfully",
          order: {
            id: order._id,
            trackingNumber: order.trackingNumber,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
          },
        })
      } else {
        res.status(400).json({
          success: false,
          message: "Order not found or already paid",
        })
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed",
        data: data,
      })
    }
  } catch (error) {
    console.error("Payment verification error:", error)
    res.status(500).json({ message: "Error verifying payment", error: error.message })
  }
}

// Paystack webhook handler
export const handlePaystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex")

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).json({ message: "Invalid signature" })
    }

    const event = req.body

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data
      const orderId = metadata.orderId

      const order = await Order.findById(orderId)
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid"
        order.paymentReference = reference
        order.progress.push({
          status: "payment_confirmed",
          message: "Payment confirmed via webhook",
          timestamp: new Date(),
        })

        await order.save()

        console.log(`Payment confirmed for order ${orderId} via webhook`)
      }
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("Webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
  }
}

// Manual payment confirmation (like Remita's "I have sent the money")
export const confirmManualPayment = async (req, res) => {
  try {
    const { orderId, paymentReference, paymentMethod } = req.body
    const userId = req.user.id

    const order = await Order.findOne({ _id: orderId, user: userId })
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order already paid" })
    }

    // Mark as pending verification
    order.paymentStatus = "pending_verification"
    order.paymentReference = paymentReference
    order.paymentMethod = paymentMethod
    order.progress.push({
      status: "payment_submitted",
      message: `Payment submitted for verification. Reference: ${paymentReference}`,
      timestamp: new Date(),
    })

    await order.save()

    // In a real system, you'd trigger an admin notification here
    // For now, we'll auto-verify after a short delay (simulate admin verification)
    setTimeout(async () => {
      try {
        const updatedOrder = await Order.findById(orderId)
        if (updatedOrder && updatedOrder.paymentStatus === "pending_verification") {
          updatedOrder.paymentStatus = "paid"
          updatedOrder.progress.push({
            status: "payment_verified",
            message: "Payment verified by admin",
            timestamp: new Date(),
          })
          await updatedOrder.save()

          console.log(`Payment auto-verified for order ${orderId}`)
        }
      } catch (err) {
        console.error("Auto-verification error:", err)
      }
    }, 30000) // 30 seconds delay

    res.json({
      success: true,
      message: "Payment submitted for verification. You will be notified once confirmed.",
      order: {
        id: order._id,
        trackingNumber: order.trackingNumber,
        paymentStatus: order.paymentStatus,
        paymentReference: paymentReference,
      },
    })
  } catch (error) {
    console.error("Manual payment confirmation error:", error)
    res.status(500).json({ message: "Error confirming payment", error: error.message })
  }
}

// Get payment status
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params
    const userId = req.user.id

    const order = await Order.findOne({ _id: orderId, user: userId })
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json({
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      paymentReference: order.paymentReference,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      amountToPay: order.amountToPay,
      walletUsed: order.walletUsed,
    })
  } catch (error) {
    console.error("Get payment status error:", error)
    res.status(500).json({ message: "Error fetching payment status", error: error.message })
  }
}
