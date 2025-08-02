import GroupPurchase from "../models/GroupPurchase.js"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Order from "../models/order.js"
import { notifyGroupSecured } from "../utils/notifications.js"

/**
 * Get all group purchases with enhanced data
 */
export const getAllGroups = async (req, res) => {
  try {
    const groups = await GroupPurchase.find()
      .populate("productId")
      .populate("participants.user", "name")
      .sort({ createdAt: -1 })

    // Update progress for each group
    const updatedGroups = groups.map((group) => {
      group.updateProgress()
      return group
    })

    res.json(updatedGroups)
  } catch (err) {
    console.error("Get all groups error:", err)
    res.status(500).json({ message: "Error fetching groups", error: err.message })
  }
}

/**
 * Get user's group purchases
 */
export const getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id

    const groups = await GroupPurchase.find({
      "participants.user": userId,
    })
      .populate("productId")
      .populate("participants.user", "name")
      .sort({ createdAt: -1 })

    res.json(groups)
  } catch (err) {
    console.error("Get my groups error:", err)
    res.status(500).json({ message: "Error fetching user groups", error: err.message })
  }
}

/**
 * Starts a new group purchase
 */
export const startGroup = async (req, res) => {
  const userId = req.user.id
  const { productId, requiredQty } = req.body

  if (!productId || !requiredQty || requiredQty <= 0) {
    return res.status(400).json({ message: "Product ID and valid requiredQty are required" })
  }

  try {
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ message: "Product not found" })

    // Check if user already has an active group for this product
    const existingGroup = await GroupPurchase.findOne({
      productId,
      "participants.user": userId,
      status: "forming",
    })

    if (existingGroup) {
      return res.status(400).json({ message: "You already have an active group for this product" })
    }

    const newGroup = await GroupPurchase.create({
      productId,
      requiredQty: product.stock, // Use total product stock
      currentQty: 0,
      participants: [],
      status: "forming",
      expiresAt: Date.now() + 48 * 3600 * 1000,
    })

    newGroup.updateProgress()
    await newGroup.save()

    res.status(201).json({
      message: "Group started successfully",
      group: newGroup,
    })
  } catch (err) {
    console.error("Start group error:", err)
    res.status(500).json({ message: "Failed to start group", error: err.message })
  }
}

/**
 * Joins a user to an existing group with stock validation
 */
export const joinGroup = async (req, res) => {
  const userId = req.user.id
  const { productId } = req.params
  const { quantity } = req.body

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "Invalid quantity selected." })
  }

  try {
    const [group, user, product] = await Promise.all([
      GroupPurchase.findOne({
        productId,
        status: "forming",
        expiresAt: { $gt: new Date() },
      }),
      User.findById(userId).populate("wallet"),
      Product.findById(productId),
    ])

    if (!group) return res.status(404).json({ message: "No active group found for this product" })
    if (!user || !user.wallet) return res.status(400).json({ message: "User wallet not found" })
    if (!product) return res.status(404).json({ message: "Product not found" })

    // Check if user already in this group
    const existingParticipant = group.participants.find((p) => p.user.toString() === userId)
    if (existingParticipant) {
      return res.status(400).json({ message: "You are already in this group purchase" })
    }

    // Check if requested quantity exceeds available stock
    const availableStock = group.requiredQty - group.currentQty
    if (quantity > availableStock) {
      return res.status(400).json({
        message: `Only ${availableStock} units available. You need to start a new group for ${quantity} units.`,
        availableStock,
        suggestNewGroup: true,
      })
    }

    const totalCost = quantity * product.basePrice

    // Add participant to group
    group.participants.push({ user: userId, quantity })
    group.currentQty += quantity

    // Update progress and check for auto-secure
    group.updateProgress()

    const wasSecured = group.status === "secured"
    await group.save()

    // If group was just secured, notify all participants and update related orders
    if (wasSecured && group.autoSecured) {
      await notifyGroupSecured(group)
      await updateRelatedOrders(group)
    }

    res.status(200).json({
      message:
        group.status === "secured"
          ? "Successfully joined group purchase. Group is now secured!"
          : "Successfully joined group purchase.",
      breakdown: {
        quantity,
        unitPrice: product.basePrice,
        totalCost,
      },
      group,
      groupSecured: group.status === "secured",
    })
  } catch (err) {
    console.error("Join group error:", err)
    res.status(500).json({ message: "An error occurred while joining the group", error: err.message })
  }
}

/**
 * Update related orders when a group is secured
 */
const updateRelatedOrders = async (group) => {
  try {
    const orders = await Order.find({
      "items.groupPurchaseId": group._id,
    })

    for (const order of orders) {
      // Update the specific item's group status
      order.items.forEach((item) => {
        if (item.groupPurchaseId && item.groupPurchaseId.toString() === group._id.toString()) {
          item.groupStatus = "secured"
        }
      })

      // Check if all groups in this order are secured
      order.checkAllGroupsSecured()
      order.calculatePriorityScore()

      await order.save()
    }
  } catch (err) {
    console.error("Error updating related orders:", err)
  }
}

/**
 * Returns the status of a group with enhanced data
 */
export const getGroupStatus = async (req, res) => {
  const { productId } = req.params
  try {
    const group = await GroupPurchase.findOne({
      productId,
      status: { $in: ["forming", "secured"] },
    }).populate("participants.user", "name")

    if (!group) return res.status(404).json({ message: "No active group found" })

    group.updateProgress()
    await group.save()

    res.json({
      ...group.toObject(),
      participantCount: group.participantCount,
      progressPercentage: group.progressPercentage,
      unitsRemaining: group.unitsRemaining,
    })
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message })
  }
}

/**
 * Get group buy progress for product cards
 */
export const getGroupProgress = async (req, res) => {
  try {
    const activeGroups = await GroupPurchase.find({
      status: "forming",
      expiresAt: { $gt: new Date() },
    }).populate("productId", "title stock")

    const progressData = activeGroups.map((group) => {
      group.updateProgress()
      return {
        productId: group.productId._id,
        productTitle: group.productId.title,
        progressPercentage: group.progressPercentage,
        participantCount: group.participantCount,
        unitsRemaining: group.unitsRemaining,
        currentQty: group.currentQty,
        requiredQty: group.requiredQty,
        status: group.status,
      }
    })

    res.json(progressData)
  } catch (err) {
    console.error("Get group progress error:", err)
    res.status(500).json({ message: "Error fetching group progress", error: err.message })
  }
}
