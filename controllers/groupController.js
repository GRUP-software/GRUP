import GroupPurchase from "../models/GroupPurchase.js"
import Product from "../models/Product.js"
import Order from "../models/order.js"
import { notifyGroupSecured } from "../utils/notifications.js"

// Create a new group purchase
export const createGroup = async (req, res) => {
  const userId = req.user.id
  const { productId, requiredQty, expiresAt } = req.body

  if (!productId || !requiredQty || requiredQty <= 0) {
    return res.status(400).json({
      success: false,
      message: "Product ID and valid requiredQty are required",
    })
  }

  try {
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Check for existing active group for this product
    const existingGroup = await GroupPurchase.findOne({
      productId: productId, // Use productId as per your schema
      status: { $in: ["forming", "secured"] },
    })

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "An active group already exists for this product",
      })
    }

    const newGroup = new GroupPurchase({
      productId: productId, // Use productId field
      requiredQty,
      currentQty: 0,
      status: "forming",
      participants: [], // Initialize empty participants array
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 48 * 3600 * 1000),
    })

    // Update progress and save
    newGroup.updateProgress()
    await newGroup.save()

    // Populate only the product (not creator since it doesn't exist in schema)
    await newGroup.populate("productId")

    res.status(201).json({
      success: true,
      message: "Group started successfully",
      data: newGroup,
    })
  } catch (err) {
    console.error("Create group error:", err)
    res.status(500).json({
      success: false,
      message: "Failed to start group",
      error: err.message,
    })
  }
}

// Join a group purchase
export const joinGroup = async (req, res) => {
  const userId = req.user.id
  const { groupId } = req.params
  const { quantity } = req.body

  if (!quantity || quantity <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid quantity selected.",
    })
  }

  try {
    const group = await GroupPurchase.findById(groupId).populate("productId")
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      })
    }

    if (group.status !== "forming") {
      return res.status(400).json({
        success: false,
        message: "Group is not accepting new members",
      })
    }

    if (new Date() > group.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Group has expired",
      })
    }

    // Check if user already joined by looking at participants array
    const existingParticipant = group.participants.find((p) => p.user.toString() === userId)

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: "You are already in this group purchase",
      })
    }

    // Check available stock
    const availableStock = group.requiredQty - group.currentQty
    if (quantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} units available. Start a new group for ${quantity} units.`,
        availableStock,
        suggestNewGroup: true,
      })
    }

    // Add participant to the group's participants array
    group.participants.push({
      user: userId,
      quantity,
      joinedAt: new Date(),
    })

    // Update current quantity
    group.currentQty += quantity

    // Update group progress
    group.updateProgress()

    const wasSecured = group.status === "secured"
    await group.save()

    // Notify participants & update orders if secured
    if (wasSecured && group.autoSecured) {
      await notifyGroupSecured(group)
      await updateRelatedOrders(group)
    }

    const totalCost = quantity * group.productId.basePrice

    res.status(200).json({
      success: true,
      message: wasSecured
        ? "Successfully joined group purchase. Group is now secured!"
        : "Successfully joined group purchase.",
      breakdown: {
        quantity,
        unitPrice: group.productId.basePrice,
        totalCost,
      },
      data: {
        groupProgress: {
          currentQty: group.currentQty,
          requiredQty: group.requiredQty,
          progressPercentage: group.progressPercentage,
          participantCount: group.participantCount,
        },
      },
      groupSecured: wasSecured,
    })
  } catch (err) {
    console.error("Join group error:", err)
    res.status(500).json({
      success: false,
      message: "Error joining group",
      error: err.message,
    })
  }
}

// Get all groups with enhanced progress data
export const getAllGroups = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query

    const filter = {}
    if (status) {
      filter.status = status
    }

    const groups = await GroupPurchase.find(filter)
      .populate("productId", "title slug images price basePrice")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupPurchase.countDocuments(filter)

    const enrichedGroups = groups.map((group) => ({
      ...group.toObject(),
      progressPercentage: Math.round(group.progressPercentage),
      participantCount: group.participantCount,
      unitsRemaining: group.unitsRemaining,
      timeRemaining: Math.max(0, group.expiresAt - new Date()),
      isExpiringSoon: group.expiresAt - new Date() < 2 * 60 * 60 * 1000,
      isNearlyComplete: group.progressPercentage >= 80,
    }))

    res.json({
      success: true,
      count: enrichedGroups.length,
      total,
      page: Number.parseInt(page),
      pages: Math.ceil(total / limit),
      data: enrichedGroups,
    })
  } catch (err) {
    console.error("Get all groups error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching groups",
      error: err.message,
    })
  }
}

// Get group status
export const getGroupStatus = async (req, res) => {
  const { productId } = req.params

  try {
    const group = await GroupPurchase.findOne({
      productId: productId,
      status: { $in: ["forming", "secured"] },
    }).populate("productId")

    if (!group) {
      return res.json({
        success: true,
        hasActiveGroup: false,
        message: "No active group found for this product",
      })
    }

    // Update progress before returning
    group.updateProgress()
    await group.save()

    res.json({
      success: true,
      hasActiveGroup: true,
      data: {
        ...group.toObject(),
        participantCount: group.participantCount,
        progressPercentage: Math.round(group.progressPercentage),
        unitsRemaining: group.unitsRemaining,
        timeRemaining: Math.max(0, group.expiresAt - new Date()),
        isExpiringSoon: group.expiresAt - new Date() < 2 * 60 * 60 * 1000,
        isNearlyComplete: group.progressPercentage >= 80,
      },
    })
  } catch (err) {
    console.error("Get group status error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching group status",
      error: err.message,
    })
  }
}

// Get all groups progress (for admin/dashboard)
export const getGroupProgress = async (req, res) => {
  try {
    const activeGroups = await GroupPurchase.find({
      status: { $in: ["forming", "secured"] },
    })
      .populate("productId", "title slug images price basePrice")
      .sort({ createdAt: -1 })

    const progressData = activeGroups.map((group) => {
      group.updateProgress()

      return {
        groupId: group._id,
        productId: group.productId._id,
        productTitle: group.productId.title,
        productSlug: group.productId.slug,
        productImage: group.productId.images?.[0] || null,
        productPrice: group.productId.price,
        creator: group.creator,
        status: group.status,
        currentQty: group.currentQty,
        requiredQty: group.requiredQty,
        progressPercentage: Math.round(group.progressPercentage * 100) / 100,
        participantCount: group.participantCount,
        unitsRemaining: group.unitsRemaining,
        createdAt: group.createdAt,
        expiresAt: group.expiresAt,
        timeRemaining: Math.max(0, group.expiresAt - new Date()),
        hoursRemaining: Math.floor(Math.max(0, group.expiresAt - new Date()) / (1000 * 60 * 60)),
        minutesRemaining: Math.floor((Math.max(0, group.expiresAt - new Date()) % (1000 * 60 * 60)) / (1000 * 60)),
        isExpiringSoon: group.expiresAt - new Date() < 2 * 60 * 60 * 1000, // 2 hours
        hasExpired: Math.max(0, group.expiresAt - new Date()) <= 0,
        autoSecured: group.autoSecured || false,
      }
    })

    res.json({
      success: true,
      count: progressData.length,
      data: progressData,
    })
  } catch (err) {
    console.error("Get group progress error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching group progress",
      error: err.message,
    })
  }
}

// Get detailed progress for a specific product's group
export const getProductGroupProgress = async (req, res) => {
  try {
    const { productId } = req.params

    const group = await GroupPurchase.findOne({
      productId: productId,
      status: { $in: ["forming", "secured"] },
    }).populate("productId", "title slug images price basePrice")

    if (!group) {
      return res.json({
        success: true,
        hasActiveGroup: false,
        productId,
        message: "No active group found for this product",
      })
    }

    // Update progress
    group.updateProgress()
    await group.save()

    const timeRemaining = Math.max(0, group.expiresAt - new Date())
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

    res.json({
      success: true,
      hasActiveGroup: true,
      data: {
        groupId: group._id,
        product: group.productId,
        status: group.status,
        currentQty: group.currentQty,
        requiredQty: group.requiredQty,
        progressPercentage: Math.round(group.progressPercentage * 100) / 100,
        participantCount: group.participantCount,
        unitsRemaining: group.unitsRemaining,
        participants: group.participants.map((p) => ({
          user: p.user,
          quantity: p.quantity,
          joinedAt: p.joinedAt,
          timeAgo: Math.floor((new Date() - p.joinedAt) / (1000 * 60)), // minutes ago
        })),
        timing: {
          createdAt: group.createdAt,
          expiresAt: group.expiresAt,
          timeRemaining,
          hoursRemaining,
          minutesRemaining,
          isExpiringSoon: timeRemaining < 2 * 60 * 60 * 1000, // 2 hours
          hasExpired: timeRemaining <= 0,
        },
        milestones: {
          isNearlyComplete: group.progressPercentage >= 80,
          isHalfway: group.progressPercentage >= 50,
          isQuarterway: group.progressPercentage >= 25,
          autoSecured: group.autoSecured || false,
        },
        savings: {
          individualPrice: group.productId.price,
          groupPrice: group.productId.basePrice,
          savingsPerUnit: group.productId.price - group.productId.basePrice,
          totalSavings: (group.productId.price - group.productId.basePrice) * group.currentQty,
        },
      },
    })
  } catch (err) {
    console.error("Get product group progress error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching product group progress",
      error: err.message,
    })
  }
}

// Get user's groups
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id

    const groups = await GroupPurchase.find({
      "participants.user": userId,
    })
      .populate("productId", "title slug images price basePrice")
      .sort({ createdAt: -1 })

    const userGroups = groups.map((group) => {
      group.updateProgress()

      const userParticipation = group.participants.find((p) => p.user.toString() === userId)

      return {
        participantId: userParticipation._id,
        quantity: userParticipation.quantity,
        joinedAt: userParticipation.joinedAt,
        group: {
          groupId: group._id,
          product: group.productId,
          status: group.status,
          currentQty: group.currentQty,
          requiredQty: group.requiredQty,
          progressPercentage: Math.round(group.progressPercentage),
          participantCount: group.participantCount,
          unitsRemaining: group.unitsRemaining,
          expiresAt: group.expiresAt,
          timeRemaining: Math.max(0, group.expiresAt - new Date()),
          isExpiringSoon: group.expiresAt - new Date() < 2 * 60 * 60 * 1000,
        },
      }
    })

    res.json({
      success: true,
      count: userGroups.length,
      data: userGroups,
    })
  } catch (err) {
    console.error("Get user groups error:", err)
    res.status(500).json({
      success: false,
      message: "Error fetching user groups",
      error: err.message,
    })
  }
}

// Secure a group (admin)
export const secureGroup = async (req, res) => {
  try {
    const { groupId } = req.params

    const group = await GroupPurchase.findById(groupId)
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      })
    }

    if (group.status !== "forming") {
      return res.status(400).json({
        success: false,
        message: "Group cannot be secured in current status",
      })
    }

    group.status = "secured"
    group.securedAt = new Date()
    await group.save()

    res.json({
      success: true,
      message: "Group secured successfully",
      data: group,
    })
  } catch (err) {
    console.error("Secure group error:", err)
    res.status(500).json({
      success: false,
      message: "Error securing group",
      error: err.message,
    })
  }
}

// Cancel a group (admin)
export const cancelGroup = async (req, res) => {
  try {
    const { groupId } = req.params

    const group = await GroupPurchase.findById(groupId)
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      })
    }

    if (group.status === "dispatched") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a dispatched group",
      })
    }

    group.status = "cancelled"
    group.cancelledAt = new Date()
    await group.save()

    res.json({
      success: true,
      message: "Group cancelled successfully",
      data: group,
    })
  } catch (err) {
    console.error("Cancel group error:", err)
    res.status(500).json({
      success: false,
      message: "Error cancelling group",
      error: err.message,
    })
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
      // Update the specific item's status
      order.items.forEach((item) => {
        if (item.groupPurchaseId && item.groupPurchaseId.toString() === group._id.toString()) {
          item.groupStatus = "secured"
        }
      })

      // Check if all groups are secured
      if (order.checkAllGroupsSecured) {
        order.checkAllGroupsSecured()
      }
      if (order.calculatePriorityScore) {
        order.calculatePriorityScore()
      }

      await order.save()
    }
  } catch (err) {
    console.error("Error updating related orders:", err)
  }
}
