import crypto from "crypto"
import Order from "../models/order.js"
import logger from "../utils/logger.js"

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

const handlePaystackWebhook = async (event) => {
  if (event.event === "charge.success") {
    const { reference, metadata } = event.data
    await updateOrderPaymentStatus(metadata.orderId, "paid", reference)
  }
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
