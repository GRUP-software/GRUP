import cron from "node-cron"
import GroupBuy from "../models/GroupBuy.js"
import Order from "../models/order.js"
import logger from "../utils/logger.js"

// Enhanced group buy expiry job - ALL expired GroupBuys go to manual review
export const processExpiredGroupBuys = async () => {
  try {
    logger.info("🔍 Starting group buy expiry check...")

    // Find all expired GroupBuys that are still active or successful
    const expiredGroupBuys = await GroupBuy.find({
      expiresAt: { $lt: new Date() },
      status: { $in: ["active", "successful"] },
    }).populate("productId", "title price")

    if (expiredGroupBuys.length === 0) {
      logger.info("✅ No expired group buys found")
      return { processed: 0, manualReview: 0 }
    }

    logger.info(`Found ${expiredGroupBuys.length} expired group buys to process`)

    let manualReviewCount = 0

    for (const groupBuy of expiredGroupBuys) {
      try {
        const progressPercentage = groupBuy.getProgressPercentage()

        logger.info(`Processing GroupBuy ${groupBuy._id}:`)
        logger.info(`  Product: ${groupBuy.productId.title}`)
        logger.info(`  Progress: ${groupBuy.unitsSold}/${groupBuy.minimumViableUnits} (${progressPercentage}%)`)
        logger.info(`  Status: ${groupBuy.status}`)

        // ALL expired GroupBuys go to manual review regardless of completion
        groupBuy.prepareForManualReview()
        await groupBuy.save()

        manualReviewCount++

        logger.info(`GroupBuy ${groupBuy._id} moved to manual review`)
        logger.info(`   Recommendation: ${groupBuy.manualReviewData.recommendedAction}`)
        logger.info(`   Notes: ${groupBuy.adminNotes}`)

        // Update related orders
        await updateRelatedOrders(groupBuy)

        // Emit WebSocket event for real-time updates
        const io = global.io
        if (io) {
          io.emit("groupBuyExpired", {
            groupBuyId: groupBuy._id,
            productId: groupBuy.productId._id,
            productTitle: groupBuy.productId.title,
            status: "manual_review",
            unitsSold: groupBuy.unitsSold,
            minimumViableUnits: groupBuy.minimumViableUnits,
            progressPercentage,
            participantCount: groupBuy.getParticipantCount(),
            message: "Group buy expired and moved to manual review",
          })

          // Notify participants
          groupBuy.participants.forEach((participant) => {
            io.to(`user_${participant.userId}`).emit("groupBuyExpired", {
              groupBuyId: groupBuy._id,
              productTitle: groupBuy.productId.title,
              status: "manual_review",
              message: "Your group buy has expired and is under admin review",
            })
          })
        }
      } catch (error) {
        logger.error(`Error processing GroupBuy ${groupBuy._id}:`, error)
      }
    }

    logger.info(`Group buy expiry processing completed:`)
    logger.info(`   Total processed: ${expiredGroupBuys.length}`)
    logger.info(`   Moved to manual review: ${manualReviewCount}`)

    return {
      processed: expiredGroupBuys.length,
      manualReview: manualReviewCount,
    }
  } catch (error) {
    logger.error("Group buy expiry job failed:", error)
    throw error
  }
}

// Helper function to update related orders when GroupBuy expires
const updateRelatedOrders = async (groupBuy) => {
  try {
    // Find orders that contain items from this GroupBuy
    const relatedOrders = await Order.find({
      "items.groupbuyId": groupBuy._id,
    })

    for (const order of relatedOrders) {
      let orderUpdated = false

      // Update items that belong to this GroupBuy
      order.items.forEach((item) => {
        if (item.groupbuyId && item.groupbuyId.toString() === groupBuy._id.toString()) {
          item.groupStatus = "under_review"
          orderUpdated = true
        }
      })

      if (orderUpdated) {
        // Add progress update
        order.progress.push({
          status: "group_under_review",
          message: `Group buy for one of your items has expired and is under admin review`,
          timestamp: new Date(),
        })

        // Update overall order status if needed
        const allItemsUnderReview = order.items.every(
          (item) => item.groupStatus === "under_review" || item.groupStatus === "secured",
        )

        if (allItemsUnderReview) {
          order.currentStatus = "groups_under_review"
        }

        await order.save()
        logger.info(`Updated order ${order.trackingNumber} for expired GroupBuy`)
      }
    }
  } catch (error) {
    logger.error(`Error updating related orders for GroupBuy ${groupBuy._id}:`, error)
  }
}

// Start the group buy expiry job
export const startGroupBuyExpiryJob = () => {
  logger.info("Group buy expiry job started")

  // Run immediately on startup
  processExpiredGroupBuys().catch((error) => {
    logger.error("Initial group buy expiry check failed:", error)
  })

  // Run every 5 minutes to check for expired group buys
  cron.schedule("*/5 * * * *", async () => {
    await processExpiredGroupBuys()
  })
}

export default processExpiredGroupBuys
