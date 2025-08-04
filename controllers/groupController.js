import GroupPurchase from "../models/GroupPurchase.js"
import GroupParticipant from "../models/GroupParticipant.js"
import Product from "../models/Product.js"

// Create a new group purchase
export const createGroup = async (req, res) => {
  try {
    const { productId, requiredQty, expiresAt } = req.body
    const userId = req.user.id

    // Check if product exists
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    // Check if there's already an active group for this product
    const existingGroup = await GroupPurchase.findOne({
      product: productId,
      status: { $in: ["forming", "secured"] },
    })

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "An active group already exists for this product",
      })
    }

    const group = new GroupPurchase({
      product: productId,
      creator: userId,
      requiredQty,
      expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24 hours
      status: "forming",
    })

    await group.save()
    await group.populate("product creator")

    res.status(201).json({
      success: true,
      message: "Group purchase created successfully",
      data: group,
    })
  } catch (err) {
    console.error("Create group error:", err)
    res.status(500).json({
      success: false,
      message: "Error creating group purchase",
      error: err.message,
    })
  }
}

// Join a group purchase
export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params
    const { quantity } = req.body
    const userId = req.user.id

    const group = await GroupPurchase.findById(groupId).populate("product")
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      })
    }

    if (group.status !== "forming") {
      return res.status(400).json({
        success: false,
        message: "Group is no longer accepting participants",
      })
    }

    if (new Date() > group.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Group has expired",
      })
    }

    // Check if user already joined
    const existingParticipant = await GroupParticipant.findOne({
      group: groupId,
      user: userId,
    })

    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: "You have already joined this group",
      })
    }

    // Check if adding this quantity would exceed required quantity
    if (group.currentQty + quantity > group.requiredQty) {
      return res.status(400).json({
        success: false,
        message: "Quantity would exceed group requirement",
      })
    }

    // Create participant
    const participant = new GroupParticipant({
      group: groupId,
      user: userId,
      quantity,
      joinedAt: new Date(),
    })

    await participant.save()

    // Update group progress
    await group.updateProgress()

    res.json({
      success: true,
      message: "Successfully joined group",
      data: {
        participant,
        groupProgress: {
          currentQty: group.currentQty,
          requiredQty: group.requiredQty,
          progressPercentage: group.progressPercentage,
          participantCount: group.participantCount,
        },
      },
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

// Get group status
export const getGroupStatus = async (req, res) => {
  try {
    const { productId } = req.params

    const group = await GroupPurchase.findOne({
      product: productId,
      status: { $in: ["forming", "secured"] },
    }).populate("product creator")

    if (!group) {
      return res.json({
        success: true,
        hasActiveGroup: false,
        message: "No active group found for this product",
      })
    }

    // Update progress before returning
    await group.updateProgress()

    const participants = await GroupParticipant.find({ group: group._id })
      .populate("user", "name email")
      .sort({ joinedAt: 1 })

    res.json({
      success: true,
      hasActiveGroup: true,
      data: {
        ...group.toObject(),
        participants,
        participantCount: group.participantCount,
        progressPercentage: group.progressPercentage,
        unitsRemaining: group.unitsRemaining,
        timeRemaining: Math.max(0, group.expiresAt - new Date()),
        isExpiringSoon: group.expiresAt - new Date() < 2 * 60 * 60 * 1000, // 2 hours
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
    const groups = await GroupPurchase.find({
      status: { $in: ["forming", "secured"] },
    })
      .populate("product", "title slug images price")
      .populate("creator", "name email")
      .sort({ createdAt: -1 })

    const progressData = await Promise.all(
      groups.map(async (group) => {
        await group.updateProgress()

        return {
          groupId: group._id,
          productId: group.product._id,
          productTitle: group.product.title,
          productSlug: group.product.slug,
          productImage: group.product.images?.[0] || null,
          productPrice: group.product.price,
          creator: group.creator,
          status: group.status,
          currentQty: group.currentQty,
          requiredQty: group.requiredQty,
          progressPercentage: Math.round(group.progressPercentage),
          participantCount: group.participantCount,
          unitsRemaining: group.unitsRemaining,
          createdAt: group.createdAt,
          expiresAt: group.expiresAt,
          timeRemaining: Math.max(0, group.expiresAt - new Date()),
          isExpiringSoon: group.expiresAt - new Date() < 2 * 60 * 60 * 1000,
          isNearlyComplete: group.progressPercentage >= 80,
          autoSecured: group.autoSecured || false,
        }
      }),
    )

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
      product: productId,
      status: { $in: ["forming", "secured"] },
    })
      .populate("product", "title slug images price basePrice")
      .populate("creator", "name email")

    if (!group) {
      return res.json({
        success: true,
        hasActiveGroup: false,
        productId,
        message: "No active group found for this product",
      })
    }

    // Update progress
    await group.updateProgress()

    // Get participants with details
    const participants = await GroupParticipant.find({ group: group._id })
      .populate("user", "name email avatar")
      .sort({ joinedAt: 1 })

    const timeRemaining = Math.max(0, group.expiresAt - new Date())
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

    res.json({
      success: true,
      hasActiveGroup: true,
      data: {
        groupId: group._id,
        product: group.product,
        creator: group.creator,
        status: group.status,
        currentQty: group.currentQty,
        requiredQty: group.requiredQty,
        progressPercentage: Math.round(group.progressPercentage * 100) / 100,
        participantCount: group.participantCount,
        unitsRemaining: group.unitsRemaining,
        participants: participants.map((p) => ({
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
          individualPrice: group.product.price,
          groupPrice: group.product.basePrice,
          savingsPerUnit: group.product.price - group.product.basePrice,
          totalSavings: (group.product.price - group.product.basePrice) * group.currentQty,
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

    const participants = await GroupParticipant.find({ user: userId })
      .populate({
        path: "group",
        populate: {
          path: "product",
          select: "title slug images price basePrice",
        },
      })
      .sort({ joinedAt: -1 })

    const userGroups = await Promise.all(
      participants.map(async (participant) => {
        const group = participant.group
        await group.updateProgress()

        return {
          participantId: participant._id,
          quantity: participant.quantity,
          joinedAt: participant.joinedAt,
          group: {
            groupId: group._id,
            product: group.product,
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
      }),
    )

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

// Get all groups (admin)
export const getAllGroups = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query

    const filter = {}
    if (status) {
      filter.status = status
    }

    const groups = await GroupPurchase.find(filter)
      .populate("product", "title slug images price basePrice")
      .populate("creator", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupPurchase.countDocuments(filter)

    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        await group.updateProgress()

        const participants = await GroupParticipant.find({ group: group._id }).populate("user", "name email")

        return {
          ...group.toObject(),
          participants,
          participantCount: group.participantCount,
          progressPercentage: group.progressPercentage,
          unitsRemaining: group.unitsRemaining,
          timeRemaining: Math.max(0, group.expiresAt - new Date()),
          isExpiringSoon: group.expiresAt - new Date() < 2 * 60 * 60 * 1000,
        }
      }),
    )

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
