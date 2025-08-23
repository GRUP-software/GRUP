import cron from "node-cron"
import GroupBuy from "../models/GroupBuy.js"
import Order from "../models/order.js"
import logger from "../utils/logger.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"

// Enhanced group buy expiry job - Implement partial order processing
export const processExpiredGroupBuys = async () => {
  try {
    logger.info("🔍 Starting group buy expiry check...")

    // Find all expired GroupBuys that are still active (exclude successful ones)
    const expiredGroupBuys = await GroupBuy.find({
      expiresAt: { $lt: new Date() },
      status: "active", // Only process active group buys, not successful ones
    }).populate("productId", "title price")

    if (expiredGroupBuys.length === 0) {
      logger.info("✅ No expired group buys found")
      return { processed: 0, manualReview: 0, partialOrders: 0 }
    }

    logger.info(`Found ${expiredGroupBuys.length} expired group buys to process`)

    let manualReviewCount = 0
    let partialOrderCount = 0

    for (const groupBuy of expiredGroupBuys) {
      try {
        const progressPercentage = groupBuy.getProgressPercentage()

        logger.info(`Processing GroupBuy ${groupBuy._id}:`)
        logger.info(`  Product: ${groupBuy.productId.title}`)
        logger.info(`  Progress: ${groupBuy.unitsSold}/${groupBuy.minimumViableUnits} (${progressPercentage}%)`)
        logger.info(`  Status: ${groupBuy.status}`)

        // Check if this group buy reached MVU
        if (groupBuy.unitsSold >= groupBuy.minimumViableUnits) {
          // This is a successful group buy, mark it as successful
          groupBuy.status = "successful"
          groupBuy.adminNotes = `Successful GroupBuy expired (${groupBuy.unitsSold}/${groupBuy.minimumViableUnits} units, ${progressPercentage.toFixed(1)}%). Ready for order processing.`
          await groupBuy.save()
          
          // Update related orders to mark this item as secured
          await updateOrderForSuccessfulGroupBuy(groupBuy)
          
          logger.info(`✅ GroupBuy ${groupBuy._id} marked as successful`)
        } else {
          // This is a failed group buy, move to manual review
          groupBuy.prepareForManualReview()
          await groupBuy.save()
          
          // Process partial order refunds for this failed product
          const partialOrderResult = await processPartialOrderRefunds(groupBuy)
          if (partialOrderResult.partialOrdersProcessed > 0) {
            partialOrderCount += partialOrderResult.partialOrdersProcessed
          }
          
          manualReviewCount++
          logger.info(`GroupBuy ${groupBuy._id} moved to manual review`)
        }

        // Emit WebSocket event for real-time updates
        const io = global.io
        if (io) {
          io.emit("groupBuyExpired", {
            groupBuyId: groupBuy._id,
            productId: groupBuy.productId._id,
            productTitle: groupBuy.productId.title,
            status: groupBuy.status,
            unitsSold: groupBuy.unitsSold,
            minimumViableUnits: groupBuy.minimumViableUnits,
            progressPercentage,
            participantCount: groupBuy.getParticipantCount(),
            message: groupBuy.status === "successful" 
              ? "Group buy was successful and is ready for processing!" 
              : "Group buy expired and is under admin review",
          })

          // Notify participants
          groupBuy.participants.forEach((participant) => {
            io.to(`user_${participant.userId}`).emit("groupBuyExpired", {
              groupBuyId: groupBuy._id,
              productTitle: groupBuy.productId.title,
              status: groupBuy.status,
              message: groupBuy.status === "successful"
                ? "Your group buy was successful and will be fulfilled!"
                : "Your group buy has expired and is under admin review",
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
    logger.info(`   Partial orders processed: ${partialOrderCount}`)

    return {
      processed: expiredGroupBuys.length,
      manualReview: manualReviewCount,
      partialOrders: partialOrderCount,
    }
  } catch (error) {
    logger.error("Group buy expiry job failed:", error)
    throw error
  }
}

// Helper function to update orders for successful group buys
const updateOrderForSuccessfulGroupBuy = async (groupBuy) => {
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
          item.groupStatus = "secured"
          orderUpdated = true
        }
      })

      if (orderUpdated) {
        // Add progress update
        order.progress.push({
          status: "group_secured",
          message: `Group buy for ${groupBuy.productId.title} was successful and is secured!`,
          timestamp: new Date(),
        })

        // Check if all groups are now secured
        order.checkAllGroupsSecured()
        await order.save()

        logger.info(`✅ Updated order ${order.trackingNumber} - group buy secured`)
      }
    }
  } catch (error) {
    logger.error(`❌ Error updating orders for successful GroupBuy ${groupBuy._id}:`, error)
  }
}

// Helper function to process partial order refunds for failed group buys
const processPartialOrderRefunds = async (groupBuy) => {
  const result = {
    partialOrdersProcessed: 0,
    totalRefunded: 0,
    errors: [],
  }

  try {
    // Find orders that contain items from this failed GroupBuy
    const relatedOrders = await Order.find({
      "items.groupbuyId": groupBuy._id,
    }).populate("items.product", "title")

    for (const order of relatedOrders) {
      try {
        // Find the specific item that failed
        const failedItem = order.items.find(
          (item) => item.groupbuyId && item.groupbuyId.toString() === groupBuy._id.toString()
        )

        if (!failedItem) continue

        // Find the user's participation in this group buy
        const userParticipation = groupBuy.getParticipant(order.user)
        if (!userParticipation) continue

        // Process refund for this specific item
        const refundAmount = userParticipation.amount

        // Find or create wallet for user
        let wallet = await Wallet.findOne({ user: order.user })
        if (!wallet) {
          wallet = new Wallet({
            user: order.user,
            balance: 0,
          })
        }

        // Add refund to wallet
        wallet.balance += refundAmount
        await wallet.save()

        // Create transaction record
        await Transaction.create({
          wallet: wallet._id,
          user: order.user,
          type: "credit",
          amount: refundAmount,
          reason: "PARTIAL_REFUND",
          description: `Partial refund for failed group buy - ${groupBuy.productId.title}`,
          metadata: {
            groupBuyId: groupBuy._id,
            orderId: order._id,
            originalQuantity: userParticipation.quantity,
            failedProduct: failedItem.product.title,
          },
        })

        // Update the failed item status
        failedItem.groupStatus = "failed"
        
        // Add progress update to order
        order.progress.push({
          status: "partial_refund",
          message: `Group buy for ${failedItem.product.title} failed. Refund of ₦${refundAmount.toLocaleString()} has been processed to your wallet.`,
          timestamp: new Date(),
        })

        // Update order status
        order.checkAllGroupsSecured()
        await order.save()

        result.partialOrdersProcessed++
        result.totalRefunded += refundAmount

        logger.info(`💰 Partial refund processed: ₦${refundAmount} for order ${order.trackingNumber}`)

        // Send notification to user about partial refund
        const notificationService = (await import('../services/notificationService.js')).default
        await notificationService.notifyPartialOrderRefund(
          order.user,
          failedItem.product.title,
          refundAmount,
          order.trackingNumber
        )

      } catch (error) {
        logger.error(`❌ Error processing partial refund for order ${order.trackingNumber}:`, error)
        result.errors.push({
          orderId: order._id,
          error: error.message,
        })
      }
    }

    logger.info(`✅ Processed ${result.partialOrdersProcessed} partial refunds totaling ₦${result.totalRefunded}`)
    return result
  } catch (error) {
    logger.error("❌ Error processing partial order refunds:", error)
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
