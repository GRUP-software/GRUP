import Order from "../models/order.js"
import Product from "../models/Product.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import GroupPurchase from "../models/GroupPurchase.js"
import { calculateDeliveryFee } from "../utils/deliveryCalculator.js"
import { generateTrackingNumber } from "../utils/trackingGenerator.js"

export const createOrder = async (req, res) => {
  const userId = req.user.id
  const { items, deliveryAddress, phone, useWallet, walletAmount } = req.body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Invalid cart items" })
  }

  if (!deliveryAddress || !phone) {
    return res.status(400).json({ message: "Delivery address and phone number are required" })
  }

  try {
    let subtotal = 0
    const processedItems = []

    // Process each item and link to group purchases
    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) return res.status(400).json({ message: "Invalid product ID" })

      // Find the group purchase for this item
      const groupPurchase = await GroupPurchase.findOne({
        productId: item.product,
        "participants.user": userId,
        status: { $in: ["forming", "secured"] },
      })

      if (!groupPurchase) {
        return res.status(400).json({
          message: `No active group purchase found for ${product.title}`,
        })
      }

      const participant = groupPurchase.participants.find((p) => p.user.toString() === userId)
      if (!participant) {
        return res.status(400).json({
          message: `You are not a participant in the group for ${product.title}`,
        })
      }

      const itemTotal = product.basePrice * participant.quantity
      subtotal += itemTotal

      processedItems.push({
        product: product._id,
        quantity: participant.quantity,
        variant: item.variant || null,
        price: product.basePrice,
        groupPurchaseId: groupPurchase._id,
        groupStatus: groupPurchase.status,
      })
    }

    // Calculate delivery fee based on location
    const deliveryFee = await calculateDeliveryFee(deliveryAddress.coordinates)
    const totalAmount = subtotal + deliveryFee

    // Handle wallet usage (excluding delivery fee)
    const wallet = await Wallet.findOne({ user: userId })
    let walletUsed = 0

    if (useWallet && wallet && wallet.balance > 0 && walletAmount > 0) {
      walletUsed = Math.min(wallet.balance, subtotal, walletAmount) // Can only offset subtotal, not delivery
      wallet.balance -= walletUsed
      await wallet.save()

      await Transaction.create({
        wallet: wallet._id,
        type: "debit",
        amount: walletUsed,
        reason: "WALLET_USED",
        description: "Wallet used for order payment (excluding delivery fee)",
      })
    }

    const amountToPay = totalAmount - walletUsed

    // Create order with enhanced tracking
    const order = new Order({
      user: userId,
      items: processedItems,
      subtotal,
      deliveryFee,
      totalAmount,
      walletUsed,
      amountToPay,
      deliveryAddress: {
        ...deliveryAddress,
        phone,
      },
      currentStatus: "groups_forming",
      progress: [
        {
          status: "groups_forming",
          message: "Order placed. Waiting for all group purchases to be secured.",
          timestamp: new Date(),
        },
      ],
      paymentMethod: walletUsed >= totalAmount ? "wallet" : "paypal",
      paymentStatus: "paid", // Immediate payment
      trackingNumber: generateTrackingNumber(),
    })

    // Calculate initial priority and check group status
    order.checkAllGroupsSecured()
    order.calculatePriorityScore()

    await order.save()

    res.status(201).json({
      message: "Order created successfully",
      order,
      breakdown: {
        subtotal,
        deliveryFee,
        walletUsed,
        amountToPay,
        totalAmount,
      },
    })
  } catch (err) {
    console.error("Create Order Error:", err)
    res.status(500).json({ message: "Error creating order", error: err.message })
  }
}

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .populate("items.groupPurchaseId")
      .sort({ createdAt: -1 })

    // Update order statuses and priority scores
    for (const order of orders) {
      order.checkAllGroupsSecured()
      order.calculatePriorityScore()
      await order.save()
    }

    res.json(orders)
  } catch (err) {
    console.error("Fetch Orders Error:", err)
    res.status(500).json({ message: "Error fetching orders", error: err.message })
  }
}

export const getOrderProgress = async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    })
      .populate("items.product", "title images")
      .populate("items.groupPurchaseId", "status progressPercentage participantCount")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update order status
    order.checkAllGroupsSecured()
    await order.save()

    // Calculate estimated delivery time if all groups are secured
    let estimatedDelivery = null
    if (order.allGroupsSecured && !order.estimatedDeliveryTime) {
      estimatedDelivery = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      order.estimatedDeliveryTime = estimatedDelivery
      await order.save()
    }

    res.json({
      order,
      estimatedDelivery: order.estimatedDeliveryTime,
      groupsProgress: order.items.map((item) => ({
        productId: item.product._id,
        productTitle: item.product.title,
        groupStatus: item.groupStatus,
        groupProgress: item.groupPurchaseId?.progressPercentage || 0,
        participantCount: item.groupPurchaseId?.participantCount || 0,
      })),
    })
  } catch (err) {
    console.error("Get Order Progress Error:", err)
    res.status(500).json({ message: "Error fetching order progress", error: err.message })
  }
}

// Admin: Get orders with priority sorting
export const getOrdersForAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "title")
      .populate("items.groupPurchaseId", "status")
      .sort({ priorityScore: -1, createdAt: -1 })

    // Update all order priorities
    for (const order of orders) {
      order.checkAllGroupsSecured()
      order.calculatePriorityScore()
      await order.save()
    }

    res.json(orders)
  } catch (err) {
    console.error("Get Admin Orders Error:", err)
    res.status(500).json({ message: "Error fetching orders for admin", error: err.message })
  }
}

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params
    const { status, message } = req.body

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    order.currentStatus = status
    order.progress.push({
      status,
      message: message || `Order status updated to ${status}`,
      timestamp: new Date(),
    })

    await order.save()

    res.json({ message: "Order status updated successfully", order })
  } catch (err) {
    console.error("Update Order Status Error:", err)
    res.status(500).json({ message: "Error updating order status", error: err.message })
  }
}
