import Cart from "../models/cart.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import GroupBuy from "../models/GroupBuy.js"
import PaymentHistory from "../models/PaymentHistory.js"
import Order from "../models/order.js"
import { generateTrackingNumber } from "../utils/trackingGenerator.js"
import crypto from "crypto"
import { nanoid } from "nanoid"
import mongoose from "mongoose"

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

// Enhanced helper function to process group buys after successful payment with race condition protection
export const processGroupBuys = async (paymentHistory) => {
  const groupBuys = []
  console.log(`🔄 Processing GroupBuys for PaymentHistory: ${paymentHistory._id}`)

  try {
    for (const item of paymentHistory.cartItems) {
      console.log(
        `Processing item: Product ${item.productId}, Quantity: ${item.quantity}, Amount: ${item.price * item.quantity}`,
      )

      const itemAmount = item.price * item.quantity

      // Ensure proper ObjectId conversion
      const userId = new mongoose.Types.ObjectId(paymentHistory.userId)
      const paymentHistoryId = new mongoose.Types.ObjectId(paymentHistory._id)
      const productId = new mongoose.Types.ObjectId(item.productId)

      console.log(`🔍 Processing for User: ${userId}, Product: ${productId}, Amount: ${itemAmount}`)

      let groupBuy = null
      let isNewGroupBuy = false

      // Try to find existing active GroupBuy for this product
      try {
        groupBuy = await GroupBuy.findOne({
          productId: productId,
          status: { $in: ["active", "successful"] },
          expiresAt: { $gt: new Date() },
        })

        if (groupBuy) {
          console.log(`✅ Found existing GroupBuy: ${groupBuy._id}`)

          // Update existing GroupBuy using the model method
          groupBuy.addOrUpdateParticipant(userId, item.quantity, itemAmount, paymentHistoryId)
          await groupBuy.save()
          console.log(`✅ Updated existing GroupBuy: ${groupBuy._id}`)
        }
      } catch (error) {
        console.error(`❌ Error finding/updating existing GroupBuy:`, error)
        groupBuy = null
      }

      // If no existing GroupBuy found, create new one
      if (!groupBuy) {
        try {
          console.log(`🆕 Creating new GroupBuy for product: ${productId}`)

          // Validate participant data before creating GroupBuy
          const participantData = {
            userId: userId,
            quantity: Number(item.quantity),
            amount: Number(itemAmount),
            paymentHistories: [paymentHistoryId],
            joinedAt: new Date(),
          }

          // Validate required fields
          if (!participantData.userId) {
            throw new Error("Participant userId is required")
          }
          if (!participantData.quantity || participantData.quantity <= 0) {
            throw new Error("Participant quantity must be a positive number")
          }
          if (!participantData.amount || participantData.amount <= 0) {
            throw new Error("Participant amount must be a positive number")
          }

          console.log(`🔍 Creating participant with validated data:`, {
            userId: participantData.userId.toString(),
            quantity: participantData.quantity,
            amount: participantData.amount,
            paymentHistoriesCount: participantData.paymentHistories.length,
          })

          const groupBuyData = {
            productId: productId,
            minimumViableUnits: 20,
            unitsSold: Number(item.quantity),
            totalAmountCollected: Number(itemAmount),
            status: "active",
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            participants: [participantData],
            paymentHistories: [paymentHistoryId],
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          console.log(`🔍 Creating GroupBuy with validated data:`, {
            productId: groupBuyData.productId.toString(),
            unitsSold: groupBuyData.unitsSold,
            totalAmountCollected: groupBuyData.totalAmountCollected,
            participantsCount: groupBuyData.participants.length,
            firstParticipant: {
              userId: groupBuyData.participants[0].userId.toString(),
              quantity: groupBuyData.participants[0].quantity,
              amount: groupBuyData.participants[0].amount,
            },
          })

          groupBuy = new GroupBuy(groupBuyData)

          // Validate before saving
          const validationError = groupBuy.validateSync()
          if (validationError) {
            console.error(`❌ GroupBuy validation failed:`, validationError.errors)
            throw validationError
          }

          await groupBuy.save()
          isNewGroupBuy = true
          console.log(`✅ Created new GroupBuy: ${groupBuy._id}`)
        } catch (error) {
          console.error(`❌ Error creating new GroupBuy:`, {
            message: error.message,
            errors: error.errors,
            stack: error.stack,
          })

          // Handle potential duplicate key error (race condition)
          if (error.code === 11000) {
            console.log(`🔄 Duplicate GroupBuy creation detected, retrying find...`)

            groupBuy = await GroupBuy.findOne({
              productId: productId,
              status: { $in: ["active", "successful"] },
              expiresAt: { $gt: new Date() },
            })

            if (groupBuy) {
              console.log(`✅ Found GroupBuy created by concurrent request: ${groupBuy._id}`)
              groupBuy.addOrUpdateParticipant(userId, item.quantity, itemAmount, paymentHistoryId)
              await groupBuy.save()
            } else {
              throw new Error(`Failed to create or find GroupBuy for product ${productId}`)
            }
          } else {
            throw error
          }
        }
      }

      if (groupBuy) {
        groupBuys.push(groupBuy)

        console.log(
          `✅ GroupBuy processed: ${groupBuy._id}, Status: ${groupBuy.status}, Units: ${groupBuy.unitsSold}/${groupBuy.minimumViableUnits}`,
        )

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
            progressPercentage: groupBuy.getProgressPercentage(),
            totalAmountCollected: groupBuy.totalAmountCollected,
            isNewGroupBuy: isNewGroupBuy,
          })
        }
      }
    }

    // Update payment history with created/joined group buys
    if (groupBuys.length > 0) {
      paymentHistory.groupBuysCreated = groupBuys.map((gb) => gb._id)
      await paymentHistory.save()
      console.log(`✅ Updated PaymentHistory with ${groupBuys.length} GroupBuy references`)
    }

    console.log(`✅ Processed ${groupBuys.length} GroupBuys for PaymentHistory: ${paymentHistory._id}`)
    return groupBuys
  } catch (error) {
    console.error(`❌ Error in processGroupBuys:`, {
      message: error.message,
      stack: error.stack,
      paymentHistoryId: paymentHistory._id,
    })
    throw error
  }
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
    await linkOrderToGroupBuys(order, groupBuys)

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
    res.status(500).json({ message: "Payment processing failed", error: error.message })
  }
}

export const initializePayment = async (req, res) => {
  try {
    const { deliveryAddress, phone, useWallet, cartId } = req.body
    const userId = req.user.id

    console.log(`🚀 Payment initialization started for user: ${userId}`)

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

    console.log(`📦 Cart found with ${cart.items.length} items`)

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

    console.log(`💰 Total amount calculated: ₦${totalPrice}`)

    // Handle wallet offset
    let walletUsed = 0
    let paystackAmount = totalPrice

    if (useWallet) {
      const wallet = await Wallet.findOne({ user: userId })
      if (wallet && wallet.balance > 0) {
        walletUsed = Math.min(wallet.balance, totalPrice)
        paystackAmount = totalPrice - walletUsed
        console.log(`💳 Wallet usage: ₦${walletUsed}, Remaining: ₦${paystackAmount}`)
      }
    }

    // Generate unique reference
    const referenceId = `GRP_${nanoid(10)}_${Date.now()}`
    console.log(`🔗 Generated reference: ${referenceId}`)

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
    console.log(`📝 PaymentHistory created: ${paymentHistory._id}`)

    // If no Paystack payment needed (fully paid by wallet)
    if (paystackAmount === 0) {
      // Process payment immediately using existing wallet-only logic
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

    console.log(`💳 Initializing Paystack payment: ₦${paystackAmount} (${paystackData.amount} kobo)`)

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

      console.log(`✅ Paystack payment initialized: ${data.data.reference}`)

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
      console.error(`❌ Paystack initialization failed:`, data.message)
      res.status(400).json({
        success: false,
        message: "Failed to initialize payment",
        error: data.message,
      })
    }
  } catch (error) {
    console.error("❌ Payment initialization error:", error)
    res.status(500).json({ message: "Error initializing payment", error: error.message })
  }
}

export const handlePaystackWebhook = async (req, res) => {
  try {
    const event = req.body

    console.log("🔔 Paystack Webhook Received")
    console.log("Event Type:", event.event)
    console.log("Reference:", event.data?.reference)

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex")

    if (hash !== req.headers["x-paystack-signature"]) {
      console.error("❌ Invalid webhook signature")
      return res.status(400).json({ message: "Invalid signature" })
    }

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data

      console.log(`✅ Processing successful charge: ${reference}`)

      // Find PaymentHistory by reference (not Order)
      const paymentHistory = await PaymentHistory.findOne({ referenceId: reference })

      if (!paymentHistory) {
        console.error(`❌ PaymentHistory not found for reference: ${reference}`)
        return res.status(404).json({ message: "Payment history not found" })
      }

      if (paymentHistory.status === "paid") {
        console.log(`⚠️ PaymentHistory ${paymentHistory._id} already processed`)
        return res.status(200).json({ message: "Payment already processed" })
      }

      console.log(`📝 Processing PaymentHistory: ${paymentHistory._id}`)

      paymentHistory.status = "paid"
      paymentHistory.paystackReference = reference
      await paymentHistory.save()

      // Handle wallet deduction if applicable
      if (paymentHistory.walletUsed > 0) {
        console.log(`💳 Deducting ${paymentHistory.walletUsed} from wallet`)
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
      console.log(`🔄 Starting GroupBuy processing for PaymentHistory: ${paymentHistory._id}`)
      const groupBuys = await processGroupBuys(paymentHistory)
      console.log(`✅ GroupBuy processing completed. Created/joined ${groupBuys.length} GroupBuys`)

      // Create Order AFTER payment confirmation
      const order = await createOrderFromPayment(paymentHistory)

      // Link order to group buys
      await linkOrderToGroupBuys(order, groupBuys)

      console.log(`✅ Webhook processed successfully - Order: ${order.trackingNumber}`)
    }

    res.status(200).json({ message: "Webhook processed" })
  } catch (error) {
    console.error("❌ Webhook error:", error)
    res.status(500).json({ message: "Webhook processing failed" })
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
    console.error("Payment verification error:", error)
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
    console.error("Get payment history error:", error)
    res.status(500).json({ message: "Error fetching payment history", error: error.message })
  }
}
