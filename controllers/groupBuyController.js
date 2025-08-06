import GroupBuy from "../models/GroupBuy.js"
import PaymentHistory from "../models/PaymentHistory.js"
import Product from "../models/Product.js"
import User from "../models/User.js"
import logger from "../utils/logger.js"

// Get all active group buys
export const getActiveGroupBuys = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query

    const groupBuys = await GroupBuy.find({
      status: { $in: ["active", "successful"] },
      expiresAt: { $gt: new Date() },
    })
      .populate("productId", "title price images description")
      .populate("participants", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupBuy.countDocuments({
      status: { $in: ["active", "successful"] },
      expiresAt: { $gt: new Date() },
    })

    const enrichedGroupBuys = groupBuys.map((groupBuy) => ({
      ...groupBuy.toObject(),
      progressPercentage: Math.round((groupBuy.unitsSold / groupBuy.minimumViableUnits) * 100),
      timeRemaining: Math.max(0, groupBuy.expiresAt - new Date()),
      isViable: groupBuy.unitsSold >= groupBuy.minimumViableUnits,
      spotsRemaining: Math.max(0, groupBuy.minimumViableUnits - groupBuy.unitsSold),
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
    })
      .populate("productId", "title price images description")
      .populate("participants", "name email")

    if (!groupBuy) {
      return res.json({
        success: true,
        hasActiveGroupBuy: false,
        message: "No active group buy for this product",
      })
    }

    const enrichedGroupBuy = {
      ...groupBuy.toObject(),
      progressPercentage: Math.round((groupBuy.unitsSold / groupBuy.minimumViableUnits) * 100),
      timeRemaining: Math.max(0, groupBuy.expiresAt - new Date()),
      isViable: groupBuy.unitsSold >= groupBuy.minimumViableUnits,
      spotsRemaining: Math.max(0, groupBuy.minimumViableUnits - groupBuy.unitsSold),
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

// Get user's group buy participations
export const getUserGroupBuys = async (req, res) => {
  try {
    const userId = req.user.id

    const groupBuys = await GroupBuy.find({
      participants: userId,
    })
      .populate("productId", "title price images")
      .sort({ createdAt: -1 })

    const enrichedGroupBuys = groupBuys.map((groupBuy) => ({
      ...groupBuy.toObject(),
      progressPercentage: Math.round((groupBuy.unitsSold / groupBuy.minimumViableUnits) * 100),
      timeRemaining: Math.max(0, groupBuy.expiresAt - new Date()),
      isViable: groupBuy.unitsSold >= groupBuy.minimumViableUnits,
      isExpired: groupBuy.expiresAt <= new Date(),
    }))

    res.json({
      success: true,
      data: enrichedGroupBuys,
      count: enrichedGroupBuys.length,
    })
  } catch (error) {
    logger.error("Get user group buys error:", error)
    res.status(500).json({ message: "Error fetching user group buys", error: error.message })
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
        },
      },
    ])

    const totalGroupBuys = await GroupBuy.countDocuments()
    const activeGroupBuys = await GroupBuy.countDocuments({
      status: "active",
      expiresAt: { $gt: new Date() },
    })
    const successfulGroupBuys = await GroupBuy.countDocuments({ status: "successful" })
    const manualReviewGroupBuys = await GroupBuy.countDocuments({ status: "manual_review" })
    const failedGroupBuys = await GroupBuy.countDocuments({ status: "failed" })

    res.json({
      success: true,
      stats: {
        total: totalGroupBuys,
        active: activeGroupBuys,
        successful: successfulGroupBuys,
        manualReview: manualReviewGroupBuys,
        failed: failedGroupBuys,
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
    const { page = 1, limit = 10 } = req.query

    const groupBuys = await GroupBuy.find({
      status: "manual_review",
    })
      .populate("productId", "title price images")
      .populate("participants", "name email")
      .populate("paymentHistories")
      .sort({ reviewedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await GroupBuy.countDocuments({ status: "manual_review" })

    const enrichedGroupBuys = groupBuys.map((groupBuy) => {
      const totalCollected = groupBuy.paymentHistories.reduce((sum, payment) => sum + payment.amount, 0)
      
      return {
        ...groupBuy.toObject(),
        progressPercentage: Math.round((groupBuy.unitsSold / groupBuy.minimumViableUnits) * 100),
        totalCollected,
        participantCount: groupBuy.participants.length,
        shortfall: (groupBuy.minimumViableUnits - groupBuy.unitsSold),
      }
    })

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
    logger.error("Get manual review group buys error:", error)
    res.status(500).json({ message: "Error fetching manual review group buys", error: error.message })
  }
}

// Admin: Update group buy status (for manual review decisions)
export const updateGroupBuyStatus = async (req, res) => {
  try {
    const { groupBuyId } = req.params
    const { status, adminNotes } = req.body

    if (!["successful", "failed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'successful' or 'failed'" })
    }

    const groupBuy = await GroupBuy.findById(groupBuyId)
    if (!groupBuy) {
      return res.status(404).json({ message: "Group buy not found" })
    }

    if (groupBuy.status !== "manual_review") {
      return res.status(400).json({ message: "Group buy is not in manual review status" })
    }

    groupBuy.status = status
    groupBuy.adminNotes = adminNotes
    
    if (status === "successful") {
      groupBuy.successfulAt = new Date()
    }

    await groupBuy.save()

    // Emit WebSocket event
    const io = global.io
    if (io) {
      io.emit("groupBuyStatusUpdate", {
        groupBuyId: groupBuy._id,
        productId: groupBuy.productId,
        status: groupBuy.status,
        unitsSold: groupBuy.unitsSold,
        minimumViableUnits: groupBuy.minimumViableUnits,
        adminDecision: true,
      })
    }

    res.json({
      success: true,
      message: `Group buy marked as ${status}`,
      data: groupBuy,
    })
  } catch (error) {
    logger.error("Update group buy status error:", error)
    res.status(500).json({ message: "Error updating group buy status", error: error.message })
  }
}
