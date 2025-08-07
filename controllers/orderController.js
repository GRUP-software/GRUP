import Order from "../models/order.js"
import Product from "../models/Product.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import GroupBuy from "../models/GroupBuy.js"
import { calculateDeliveryFee } from "../utils/deliveryCalculator.js"
import { generateTrackingNumber } from "../utils/trackingGenerator.js"


export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .populate("items.Id")
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
      .populate("items.groupbuyId", "status progressPercentage participantCount")

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
        groupProgress: item.groupbuyId?.progressPercentage || 0,
        participantCount: item.groupbuyId?.participantCount || 0,
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
      .populate("items.groupbuyId", "status")
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
