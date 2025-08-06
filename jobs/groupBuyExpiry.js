import cron from "node-cron"
import GroupBuy from "../models/GroupBuy.js"
import logger from "../utils/logger.js"

// Process expired group buys and move to manual review
export const processExpiredGroupBuys = async () => {
  try {
    logger.info("Starting expired group buy processing...")

    // Find expired group buys that haven't been processed
    const expiredGroupBuys = await GroupBuy.find({
      status: "active",
      expiresAt: { $lte: new Date() },
    }).populate("paymentHistories")

    logger.info(`Found ${expiredGroupBuys.length} expired group buys to process`)

    for (const groupBuy of expiredGroupBuys) {
      if (groupBuy.unitsSold >= groupBuy.minimumViableUnits) {
        // Group buy was successful, mark as successful
        groupBuy.status = "successful"
        groupBuy.successfulAt = new Date()
        logger.info(`Group buy ${groupBuy._id} marked as successful with ${groupBuy.unitsSold} units`)
      } else {
        // Group buy didn't reach MVU, move to manual review
        groupBuy.status = "manual_review"
        groupBuy.reviewedAt = new Date()
        groupBuy.adminNotes = `Expired without reaching MVU (${groupBuy.unitsSold}/${groupBuy.minimumViableUnits} units). Awaiting admin decision.`
        logger.info(`Group buy ${groupBuy._id} moved to manual review - ${groupBuy.unitsSold}/${groupBuy.minimumViableUnits} units`)
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
          requiresAdminReview: groupBuy.status === "manual_review",
        })
      }
    }

    logger.info("Expired group buy processing completed")
  } catch (error) {
    logger.error("Error processing expired group buys:", error)
  }
}

// Start the cron job
export const startGroupBuyExpiryJob = () => {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    await processExpiredGroupBuys()
  })

  logger.info("Group buy expiry cron job started (runs every 5 minutes)")
}

export default processExpiredGroupBuys
