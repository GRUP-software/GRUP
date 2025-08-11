import GroupBuy from "../models/GroupBuy.js"
import Order from "../models/order.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import logger from "../utils/logger.js"

// Get all active group buys
export const getActiveGroupBuys = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const groupBuys = await GroupBuy.find({
      status: { $in: ["active", "successful"] },
      expiresAt: { $gt: new Date() },
    })
      .populate("productId", "title price images description unitTag slug")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupBuy.countDocuments({
      status: { $in: ["active", "successful"] },
      expiresAt: { $gt: new Date() },
    })

    const enrichedGroupBuys = groupBuys.map((groupBuy) => ({
      ...groupBuy.toObject(),
      progressPercentage: groupBuy.getProgressPercentage(),
      timeRemaining: Math.max(0, groupBuy.expiresAt - new Date()),
      isViable: groupBuy.unitsSold >= groupBuy.minimumViableUnits,
      spotsRemaining: Math.max(0, groupBuy.minimumViableUnits - groupBuy.unitsSold),
      canAcceptMore: groupBuy.canAcceptMoreParticipants(),
    }))

    res.json({
      success: true,
      data: enrichedGroupBuys,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Get active group buys error:", error)
    res.status(500).json({ message: "Error fetching group buys", error: error.message })
  }
}

// Get group buy by product ID
export const getGroupBuyByProduct = async (req, res) => {
  try {
    const { productId } = req.params

    const groupBuy = await GroupBuy.findOne({
      productId,
      status: { $in: ["active", "successful"] },
      expiresAt: { $gt: new Date() },
    }).populate("productId", "title price images description unitTag slug")

    if (!groupBuy) {
      return res.json({
        success: true,
        hasActiveGroupBuy: false,
        message: "No active group buy for this product",
      })
    }

    const enrichedGroupBuy = {
      ...groupBuy.toObject(),
      progressPercentage: groupBuy.getProgressPercentage(),
      timeRemaining: Math.max(0, groupBuy.expiresAt - new Date()),
      isViable: groupBuy.unitsSold >= groupBuy.minimumViableUnits,
      spotsRemaining: Math.max(0, groupBuy.minimumViableUnits - groupBuy.unitsSold),
      canAcceptMore: groupBuy.canAcceptMoreParticipants(),
    }

    res.json({
      success: true,
      hasActiveGroupBuy: true,
      data: enrichedGroupBuy,
    })
  } catch (error) {
    logger.error("Get group buy by product error:", error)
    res.status(500).json({ message: "Error fetching group buy", error: error.message })
  }
}

// Get all group buys with enhanced filtering
export const getAllGroupBuys = async (req, res) => {
  try {
    const { status, productId, page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", userId } = req.query

    // Build filter object
    const filter = {}
    if (status) filter.status = status
    if (productId) filter.productId = productId

    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const groupBuys = await GroupBuy.find(filter)
      .populate("productId", "title price images category slug")
      .populate("participants.userId", "firstName lastName email")
      .populate("paymentHistories", "referenceId amount status createdAt")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupBuy.countDocuments(filter)

    // Enhanced response with user-specific data if userId provided
    const enhancedGroupBuys = groupBuys.map((groupBuy) => {
      const groupBuyObj = groupBuy.toObject()

      // Add computed fields
      groupBuyObj.progressPercentage = groupBuy.getProgressPercentage()
      groupBuyObj.participantCount = groupBuy.getParticipantCount()
      groupBuyObj.isExpired = groupBuy.isExpired()

      // Add user-specific data if userId provided
      if (userId) {
        const userParticipation = groupBuy.getParticipant(userId)
        if (userParticipation) {
          groupBuyObj.userParticipation = {
            quantity: userParticipation.quantity,
            amount: userParticipation.amount,
            joinedAt: userParticipation.joinedAt,
            purchaseCount: userParticipation.paymentHistories.length,
          }
        }
      }

      return groupBuyObj
    })

    res.json({
      success: true,
      data: enhancedGroupBuys,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Get all group buys error:", error)
    res.status(500).json({ message: "Error fetching group buys", error: error.message })
  }
}

// Get user's group buys with enhanced data
export const getUserGroupBuys = async (req, res) => {
  try {
    const userId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

    // Build filter
    const filter = { "participants.userId": userId }
    if (status) filter.status = status

    const groupBuys = await GroupBuy.find(filter)
      .populate("productId", "title price images category slug")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupBuy.countDocuments(filter)

    // Enhanced response with user-specific data
    const userGroupBuys = groupBuys.map((groupBuy) => {
      const userParticipation = groupBuy.getParticipant(userId)

      return {
        _id: groupBuy._id,
        productId: groupBuy.productId,
        status: groupBuy.status,
        unitsSold: groupBuy.unitsSold,
        minimumViableUnits: groupBuy.minimumViableUnits,
        totalAmountCollected: groupBuy.totalAmountCollected,
        progressPercentage: groupBuy.getProgressPercentage(),
        participantCount: groupBuy.getParticipantCount(),
        expiresAt: groupBuy.expiresAt,
        isExpired: groupBuy.isExpired(),
        createdAt: groupBuy.createdAt,
        // User-specific data
        userQuantity: userParticipation?.quantity || 0,
        userAmount: userParticipation?.amount || 0,
        userJoinedAt: userParticipation?.joinedAt,
        userPurchaseCount: userParticipation?.paymentHistories.length || 0,
      }
    })

    res.json({
      success: true,
      data: userGroupBuys,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Get user group buys error:", error)
    res.status(500).json({ message: "Error fetching user group buys", error: error.message })
  }
}

// Get single group buy with detailed information
export const getGroupBuyById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    const groupBuy = await GroupBuy.findById(id)
      .populate("productId", "title price images category description slug")
      .populate("participants.userId", "firstName lastName email phone")
      .populate("paymentHistories", "referenceId amount status createdAt")

    if (!groupBuy) {
      return res.status(404).json({ message: "Group buy not found" })
    }

    const groupBuyData = {
      ...groupBuy.toObject(),
      progressPercentage: groupBuy.getProgressPercentage(),
      participantCount: groupBuy.getParticipantCount(),
      isExpired: groupBuy.isExpired(),
    }

    // Add user-specific data if user is authenticated
    if (userId) {
      const userParticipation = groupBuy.getParticipant(userId)
      if (userParticipation) {
        groupBuyData.userParticipation = {
          quantity: userParticipation.quantity,
          amount: userParticipation.amount,
          joinedAt: userParticipation.joinedAt,
          purchaseCount: userParticipation.paymentHistories.length,
        }
      }
    }

    res.json({
      success: true,
      data: groupBuyData,
    })
  } catch (error) {
    logger.error("Get group buy by ID error:", error)
    res.status(500).json({ message: "Error fetching group buy", error: error.message })
  }
}

// Admin: Get group buy statistics
export const getGroupBuyStats = async (req, res) => {
  try {
    const stats = await GroupBuy.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalUnits: { $sum: "$unitsSold" },
          totalAmount: { $sum: "$totalAmountCollected" },
        },
      },
    ])

    const totalGroupBuys = await GroupBuy.countDocuments()
    const activeGroupBuys = await GroupBuy.countDocuments({ status: "active" })
    const successfulGroupBuys = await GroupBuy.countDocuments({ status: "successful" })
    const manualReviewGroupBuys = await GroupBuy.countDocuments({ status: "manual_review" })

    res.json({
      success: true,
      data: {
        total: totalGroupBuys,
        active: activeGroupBuys,
        successful: successfulGroupBuys,
        manualReview: manualReviewGroupBuys,
        byStatus: stats,
      },
    })
  } catch (error) {
    logger.error("Get group buy stats error:", error)
    res.status(500).json({ message: "Error fetching group buy statistics", error: error.message })
  }
}

// Admin: Get group buys pending manual review
export const getManualReviewGroupBuys = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = "expiresAt", sortOrder = "asc" } = req.query

    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const groupBuys = await GroupBuy.find({ status: "manual_review" })
      .populate("productId", "title price images category slug")
      .populate("participants.userId", "firstName lastName email phone")
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupBuy.countDocuments({ status: "manual_review" })

    // Enhanced data for admin review
    const reviewData = groupBuys.map((groupBuy) => ({
      ...groupBuy.toObject(),
      progressPercentage: groupBuy.getProgressPercentage(),
      participantCount: groupBuy.getParticipantCount(),
      daysExpired: Math.ceil((new Date() - groupBuy.expiresAt) / (1000 * 60 * 60 * 24)),
      recommendedAction: groupBuy.manualReviewData.recommendedAction,
      reviewNotes: groupBuy.manualReviewData.reviewNotes,
    }))

    res.json({
      success: true,
      data: reviewData,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Get manual review group buys error:", error)
    res.status(500).json({ message: "Error fetching manual review group buys", error: error.message })
  }
}

// Admin: Approve or reject group buy after manual review
export const reviewGroupBuy = async (req, res) => {
  try {
    const { id } = req.params
    const { action, adminNotes, reviewedBy } = req.body

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'approve' or 'reject'" })
    }

    const groupBuy = await GroupBuy.findById(id)
      .populate("productId", "title price slug")
      .populate("participants.userId", "firstName lastName email")

    if (!groupBuy) {
      return res.status(404).json({ message: "Group buy not found" })
    }

    if (groupBuy.status !== "manual_review") {
      return res.status(400).json({ message: "Group buy is not pending manual review" })
    }

    if (action === "approve") {
      // Approve the group buy
      groupBuy.status = "fulfilled"
      groupBuy.adminNotes =
        adminNotes ||
        `Approved after manual review - ${groupBuy.unitsSold}/${groupBuy.minimumViableUnits} units achieved`

      // Update manual review data
      groupBuy.manualReviewData.reviewedBy = reviewedBy || "Admin"
      groupBuy.manualReviewData.reviewNotes = adminNotes || "Approved for fulfillment"
      groupBuy.manualReviewData.recommendedAction = "approve"

      await groupBuy.save()

      // Update related orders
      await updateOrdersAfterReview(groupBuy, "approved")

      logger.info(`✅ GroupBuy ${groupBuy._id} approved by admin`)

      // Emit WebSocket events
      const io = global.io
      if (io) {
        // Notify all participants
        groupBuy.participants.forEach((participant) => {
          io.to(`user_${participant.userId._id}`).emit("groupBuyApproved", {
            groupBuyId: groupBuy._id,
            productTitle: groupBuy.productId.title,
            message: "Great news! Your group buy has been approved and will be fulfilled.",
          })
        })
      }

      res.json({
        success: true,
        message: "Group buy approved successfully",
        data: groupBuy,
      })
    } else if (action === "reject") {
      // Reject the group buy and process refunds
      groupBuy.status = "failed"
      groupBuy.adminNotes =
        adminNotes ||
        `Rejected after manual review - insufficient participation (${groupBuy.unitsSold}/${groupBuy.minimumViableUnits} units)`

      // Update manual review data
      groupBuy.manualReviewData.reviewedBy = reviewedBy || "Admin"
      groupBuy.manualReviewData.reviewNotes = adminNotes || "Rejected - refunds processed"
      groupBuy.manualReviewData.recommendedAction = "reject"

      await groupBuy.save()

      // Process refunds
      const refundResult = await processGroupBuyRefunds(groupBuy)

      // Update related orders
      await updateOrdersAfterReview(groupBuy, "rejected")

      logger.info(`❌ GroupBuy ${groupBuy._id} rejected by admin - ${refundResult.refundsProcessed} refunds processed`)

      // Emit WebSocket events
      const io = global.io
      if (io) {
        // Notify all participants
        groupBuy.participants.forEach((participant) => {
          io.to(`user_${participant.userId._id}`).emit("groupBuyRejected", {
            groupBuyId: groupBuy._id,
            productTitle: groupBuy.productId.title,
            message: "Your group buy was not successful. Refunds have been processed to your wallet.",
          })
        })
      }

      res.json({
        success: true,
        message: "Group buy rejected and refunds processed",
        data: {
          groupBuy,
          refundsSummary: refundResult,
        },
      })
    }
  } catch (error) {
    logger.error("Review group buy error:", error)
    res.status(500).json({ message: "Error reviewing group buy", error: error.message })
  }
}

// Helper function to process refunds for failed group buy
const processGroupBuyRefunds = async (groupBuy) => {
  const refundResults = {
    refundsProcessed: 0,
    totalRefunded: 0,
    errors: [],
  }

  try {
    // Process refunds for each participant
    for (const participant of groupBuy.participants) {
      try {
        // Find or create wallet for user
        let wallet = await Wallet.findOne({ user: participant.userId })
        if (!wallet) {
          wallet = new Wallet({
            user: participant.userId,
            balance: 0,
          })
        }

        // Add refund to wallet
        wallet.balance += participant.amount
        await wallet.save()

        // Create transaction record
        await Transaction.create({
          wallet: wallet._id,
          user: participant.userId,
          type: "credit",
          amount: participant.amount,
          reason: "REFUND",
          description: `Refund for failed group buy - ${groupBuy.productId.title}`,
          metadata: {
            groupBuyId: groupBuy._id,
            originalQuantity: participant.quantity,
          },
        })

        refundResults.refundsProcessed++
        refundResults.totalRefunded += participant.amount

        logger.info(`💰 Refunded ₦${participant.amount} to user ${participant.userId}`)
      } catch (error) {
        logger.error(`❌ Error processing refund for user ${participant.userId}:`, error)
        refundResults.errors.push({
          userId: participant.userId,
          amount: participant.amount,
          error: error.message,
        })
      }
    }

    logger.info(`✅ Processed ${refundResults.refundsProcessed} refunds totaling ₦${refundResults.totalRefunded}`)
    return refundResults
  } catch (error) {
    logger.error("❌ Error processing group buy refunds:", error)
    throw error
  }
}

// Helper function to update orders after admin review
const updateOrdersAfterReview = async (groupBuy, reviewResult) => {
  try {
    const relatedOrders = await Order.find({
      "items.groupbuyId": groupBuy._id,
    })

    for (const order of relatedOrders) {
      let orderUpdated = false

      // Update items that belong to this GroupBuy
      order.items.forEach((item) => {
        if (item.groupbuyId && item.groupbuyId.toString() === groupBuy._id.toString()) {
          if (reviewResult === "approved") {
            item.groupStatus = "secured"
          } else {
            item.groupStatus = "failed"
          }
          orderUpdated = true
        }
      })

      if (orderUpdated) {
        // Add progress update
        const message =
          reviewResult === "approved"
            ? "Group buy approved! Your item is secured and will be fulfilled."
            : "Group buy was not successful. Refund has been processed to your wallet."

        order.progress.push({
          status: reviewResult === "approved" ? "group_secured" : "group_failed",
          message,
          timestamp: new Date(),
        })

        // Update overall order status
        order.checkAllGroupsSecured()
        await order.save()

        logger.info(`📦 Updated order ${order.trackingNumber} after GroupBuy review`)
      }
    }
  } catch (error) {
    logger.error(`❌ Error updating orders after GroupBuy review:`, error)
  }
}


export const updateGroupBuyMVU = async (req, res) => {
  try {
    const { id } = req.params
    const { minimumViableUnits, adminNotes } = req.body

    if (!minimumViableUnits || minimumViableUnits < 1) {
      return res.status(400).json({ message: "Minimum viable units must be at least 1" })
    }

    const groupBuy = await GroupBuy.findById(id)
    if (!groupBuy) {
      return res.status(404).json({ message: "Group buy not found" })
    }

    const oldMVU = groupBuy.minimumViableUnits
    groupBuy.minimumViableUnits = minimumViableUnits
    groupBuy.adminNotes = adminNotes || `MVU updated from ${oldMVU} to ${minimumViableUnits}`

    // Update status based on new MVU
    if (groupBuy.unitsSold >= minimumViableUnits && groupBuy.status === "active") {
      groupBuy.status = "successful"
    } else if (groupBuy.unitsSold < minimumViableUnits && groupBuy.status === "successful") {
      groupBuy.status = "active"
    }

    await groupBuy.save()

    logger.info(`📊 GroupBuy ${groupBuy._id} MVU updated from ${oldMVU} to ${minimumViableUnits}`)

    res.json({
      success: true,
      message: "Group buy MVU updated successfully",
      data: {
        ...groupBuy.toObject(),
        progressPercentage: groupBuy.getProgressPercentage(),
      },
    })
  } catch (error) {
    logger.error("Update group buy MVU error:", error)
    res.status(500).json({ message: "Error updating group buy MVU", error: error.message })
  }
}
