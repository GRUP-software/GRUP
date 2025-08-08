import Order from "../models/order.js"
import Cart from "../models/cart.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import { nanoid } from "nanoid"
import { processGroupBuys } from "./checkoutController.js" // Re-use group buy processing logic

export const initializePayment = async (req, res) => {
  try {
    const { deliveryAddress, phone, useWallet, walletAmount, cartId } = req.body
    const userId = req.user.id

    // Validate delivery address
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !phone) {
      return res.status(400).json({ message: "Delivery address (street, city, state) and phone are required." })
    }

    // Fetch cart
    const cart = await Cart.findById(cartId).populate("items.product")
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty or not found." })
    }

    let subtotal = 0
    const orderItems = []

    for (const item of cart.items) {
      const product = item.product
      if (!product) {
        return res.status(400).json({ message: `Product not found for item in cart.` })
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.title}.` })
      }
      subtotal += product.price * item.quantity
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        variant: item.variant, // Include variant if applicable
      })
    }

    // Calculate delivery fee (placeholder for now, as coordinate logic is removed)
    // In a real scenario, this would depend on the delivery address and possibly region.
    const deliveryFee = 1000 // Example fixed delivery fee

    let totalAmount = subtotal + deliveryFee
    let amountToPay = totalAmount
    let walletUsed = 0

    if (useWallet) {
      const wallet = await Wallet.findOne({ user: userId })
      if (!wallet) {
        return res.status(400).json({ message: "Wallet not found." })
      }
      // Use either the requested walletAmount or the full balance, up to the total amount
      walletUsed = Math.min(wallet.balance, walletAmount || wallet.balance, totalAmount)
      amountToPay = totalAmount - walletUsed
    }

    // Generate unique reference for the order
    const reference = `ORD_${nanoid(10)}_${Date.now()}`

    // Create the order with pending payment status
    const order = new Order({
      user: userId,
      items: orderItems,
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
      currentStatus: amountToPay > 0 ? "payment_pending" : "groups_forming", // Set status based on payment need
      paymentStatus: amountToPay > 0 ? "pending" : "paid", // Set payment status
      paymentMethod: amountToPay > 0 ? "card" : "wallet", // Default to card if payment needed, else wallet
      trackingNumber: `TRK_${nanoid(8)}`, // Generate a simple tracking number
    })

    await order.save()

    // If amountToPay is 0 (fully paid by wallet), process immediately
    if (amountToPay === 0) {
      // Deduct from wallet
      const wallet = await Wallet.findOne({ user: userId })
      wallet.balance -= walletUsed
      await wallet.save()

      // Log wallet transaction
      const transaction = new Transaction({
        user: userId,
        type: "debit",
        amount: walletUsed,
        description: `Payment for Order ${order._id} using wallet`,
        balanceAfter: wallet.balance,
        order: order._id,
      })
      await transaction.save()

      // Process group buys and clear cart
      await processGroupBuys({ userId, cartItems: order.items, _id: order._id }) // Pass necessary data for group buy processing
      await Cart.findByIdAndDelete(cartId) // Clear the cart

      // Update order status to reflect group forming
      order.currentStatus = "groups_forming"
      order.progress.push({
        status: "groups_forming",
        message: "Order placed and groups are now forming.",
        timestamp: new Date(),
      })
      await order.save()

      return res.json({
        success: true,
        message: "Order placed successfully using wallet!",
        orderId: order._id,
        reference: reference,
        amount: amountToPay,
        walletUsed: walletUsed,
        totalAmount: totalAmount,
      })
    }

    // Initialize Paystack payment for remaining amount
    const paystackData = {
      email: req.user.email || "customer@grup.com", // Use user's email or a default
      amount: Math.round(amountToPay * 100), // Convert to kobo
      reference: reference,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`, // Frontend callback URL
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
        walletUsed: walletUsed,
        custom_fields: [
          {
            display_name: "Order ID",
            variable_name: "order_id",
            value: order._id.toString(),
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
      // Update order with Paystack authorization URL and reference
      order.paystackAuthorizationUrl = data.data.authorization_url
      order.paystackReference = data.data.reference
      await order.save()

      // Clear the cart after successful payment initialization
      await Cart.findByIdAndDelete(cartId)

      res.json({
        success: true,
        paymentUrl: data.data.authorization_url,
        reference: reference,
        orderId: order._id,
        amount: amountToPay,
        walletUsed: walletUsed,
        totalAmount: totalAmount,
        message: "Payment initialized successfully. Redirecting to Paystack...",
      })
    } else {
      // If Paystack initialization fails, delete the created order
      await Order.findByIdAndDelete(order._id)
      res.status(400).json({
        success: false,
        message: "Failed to initialize payment with Paystack",
        error: data.message,
      })
    }
  } catch (error) {
    console.error("Payment initialization error:", error)
    res.status(500).json({ message: "Payment initialization failed", error: error.message })
  }
}

export const handlePaystackWebhook = async (req, res) => {
  // This function would handle the Paystack webhook events
  // It would verify the signature, then process the payment status
  // and update the order accordingly.
  // This logic is typically in webhookController.js or paymentController.js
  // but for brevity, it's not fully implemented here.
  res.status(200).json({ message: "Webhook received (handler not fully implemented here)" })
}
