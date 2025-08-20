import Notification from "../models/Notification.js"
import logger from "../utils/logger.js"

class NotificationService {
  constructor() {
    this.io = null
  }

  setIO(io) {
    this.io = io
  }

  async createNotification(notificationData) {
    try {
      const notification = await Notification.createNotification(notificationData)

      if (this.io && notification.userId) {
        this.io.to(`user_${notification.userId}`).emit("notification:new", {
          notification: notification.toJSON(),
        })
      }

      logger.info(`Notification created for user ${notification.userId}: ${notification.title}`)
      return notification
    } catch (error) {
      logger.error("Error creating notification:", error)
      throw error
    }
  }

  // Payment notifications
  async notifyPaymentSuccess(userId, amount, paymentMethod, orderId = null) {
    return await this.createNotification({
      userId,
      type: "success",
      category: "payment",
      title: "Payment Successful",
      message: `Payment of ₦${amount?.toLocaleString()} via ${paymentMethod} was successful!`,
      data: { amount, paymentMethod, orderId },
      priority: "high",
      actionUrl: orderId ? `/account/orders/${orderId}` : "/account",
      actionText: "View Order",
    })
  }

  async notifyPaymentFailed(userId, error, amount, paymentMethod) {
    return await this.createNotification({
      userId,
      type: "error",
      category: "payment",
      title: "Payment Failed",
      message: `Payment of ₦${amount?.toLocaleString()} via ${paymentMethod} failed: ${error}`,
      data: { error, amount, paymentMethod },
      priority: "high",
      actionUrl: "/checkout",
      actionText: "Try Again",
    })
  }

  // Order tracking notifications
  async notifyOrderCreated(userId, orderData) {
    return await this.createNotification({
      userId,
      type: "success",
      category: "order",
      title: "Order Created Successfully!",
      message: `Order #${orderData.trackingNumber} has been created. Total: ₦${orderData.totalAmount?.toLocaleString()}`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        totalAmount: orderData.totalAmount,
        groupBuysJoined: orderData.groupBuysJoined,
      },
      priority: "high",
      actionUrl: `/account/orders/${orderData.orderId}`,
      actionText: "Track Order",
    })
  }

  async notifyOrderStatusUpdate(userId, orderData, status, message) {
    return await this.createNotification({
      userId,
      type: "info",
      category: "order",
      title: `Order Status: ${status}`,
      message: `Order #${orderData.trackingNumber}: ${message}`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        status,
        message,
      },
      priority: "medium",
      actionUrl: `/account/orders/${orderData.orderId}`,
      actionText: "View Details",
    })
  }

  async notifyTrackingNumberAssigned(userId, orderData) {
    return await this.createNotification({
      userId,
      type: "info",
      category: "order",
      title: "Tracking Number Assigned",
      message: `Your order has been assigned tracking number: ${orderData.trackingNumber}. Use this to track your order progress.`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
      },
      priority: "medium",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "Track Order",
    })
  }

  async notifyOrderProcessing(userId, orderData, estimatedTime = null) {
    const timeMessage = estimatedTime ? ` Estimated processing time: ${estimatedTime}.` : ""
    return await this.createNotification({
      userId,
      type: "info",
      category: "order",
      title: "Order Processing Started",
      message: `Your order #${orderData.trackingNumber} is now being processed and prepared for fulfillment.${timeMessage}`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        estimatedTime,
      },
      priority: "medium",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "Track Progress",
    })
  }

  async notifyOrderReadyForPickup(userId, orderData, pickupLocation = null) {
    const locationMessage = pickupLocation ? ` Pickup location: ${pickupLocation}.` : ""
    return await this.createNotification({
      userId,
      type: "success",
      category: "order",
      title: "Order Ready for Pickup! 📦",
      message: `Great news! Your order #${orderData.trackingNumber} is ready for pickup.${locationMessage} Bring your tracking number for identification.`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        pickupLocation,
      },
      priority: "high",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "View Pickup Details",
    })
  }

  async notifyOrderPackaged(userId, orderData, fulfillmentOptions = null) {
    const optionsMessage = fulfillmentOptions ? " You will receive fulfillment options shortly." : ""
    return await this.createNotification({
      userId,
      type: "success",
      category: "order",
      title: "Order Packaged Successfully",
      message: `Your order #${orderData.trackingNumber} has been packaged and is ready for fulfillment.${optionsMessage}`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        fulfillmentOptions,
      },
      priority: "medium",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "View Status",
    })
  }

  async notifyOrderOutForDelivery(userId, orderData, deliveryInfo = null) {
    const deliveryMessage = deliveryInfo ? ` ${deliveryInfo}` : ""
    return await this.createNotification({
      userId,
      type: "info",
      category: "order",
      title: "Order Out for Delivery 🚚",
      message: `Your order #${orderData.trackingNumber} is out for delivery and should arrive soon!${deliveryMessage}`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        deliveryInfo,
      },
      priority: "high",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "Track Delivery",
    })
  }

  async notifyOrderDelivered(userId, orderData) {
    return await this.createNotification({
      userId,
      type: "success",
      category: "order",
      title: "Order Delivered Successfully! ✅",
      message: `Your order #${orderData.trackingNumber} has been delivered. Thank you for shopping with us!`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
      },
      priority: "medium",
      actionUrl: `/account/orders/${orderData.orderId}`,
      actionText: "Rate Order",
    })
  }

  // Group buy notifications
  async notifyGroupBuySecured(userId, productName, groupBuyId) {
    return await this.createNotification({
      userId,
      type: "success",
      category: "group_buy",
      title: "Group Buy Secured!",
      message: `Group buy for "${productName}" has been secured! Your order is being processed.`,
      data: { productName, groupBuyId },
      priority: "high",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })
  }

  async notifyAllGroupBuysSecured(userId, orderData, securedItems) {
    const itemsList = securedItems.map((item) => item.productName).join(", ")
    return await this.createNotification({
      userId,
      type: "success",
      category: "group_buy",
      title: "All Group Buys Secured! 🎉",
      message: `Excellent! All group buys for order #${orderData.trackingNumber} have been secured: ${itemsList}. Your order will be processed within 24 hours.`,
      data: {
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        securedItems,
        itemCount: securedItems.length,
      },
      priority: "high",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "Track Order",
    })
  }

  async notifyGroupBuyExpiring(userId, productName, groupBuyId, hoursLeft, progressPercentage) {
    return await this.createNotification({
      userId,
      type: "warning",
      category: "group_buy",
      title: "Group Buy Expiring Soon!",
      message: `Group buy for "${productName}" expires in ${hoursLeft} hours. Progress: ${progressPercentage}%`,
      data: { productName, groupBuyId, hoursLeft, progressPercentage },
      priority: "high",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })
  }

  async notifyGroupBuyExpired(userId, productName, groupBuyId, status, message) {
    const notificationType = status === "successful" ? "success" : "error"
    const title = status === "successful" ? "Group Buy Successful!" : "Group Buy Expired"

    return await this.createNotification({
      userId,
      type: notificationType,
      category: "group_buy",
      title,
      message: `Group buy for "${productName}": ${message}`,
      data: { productName, groupBuyId, status, message },
      priority: "high",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })
  }

  async notifyGroupBuyManualReview(userId, productName, groupBuyId, progressPercentage) {
    return await this.createNotification({
      userId,
      type: "info",
      category: "group_buy",
      title: "Group Buy Under Review",
      message: `Group buy for "${productName}" (${progressPercentage}% complete) is under admin review.`,
      data: { productName, groupBuyId, progressPercentage },
      priority: "medium",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })
  }

  // Referral notifications
  async notifyReferralBonus(userId, amount, referralName) {
    return await this.createNotification({
      userId,
      type: "success",
      category: "referral",
      title: "Referral Bonus Earned!",
      message: `You earned ₦${amount?.toLocaleString()} bonus from ${referralName}'s purchase!`,
      data: { amount, referralName },
      priority: "medium",
      actionUrl: "/account/referrals",
      actionText: "View Referrals",
    })
  }

  // Wallet notifications
  async notifyWalletUpdate(userId, oldBalance, newBalance, reason, transactionId = null) {
    const difference = newBalance - oldBalance
    const isCredit = difference > 0

    return await this.createNotification({
      userId,
      type: isCredit ? "success" : "info",
      category: "wallet",
      title: "Wallet Updated",
      message: `Wallet ${isCredit ? "credited" : "debited"} ₦${Math.abs(difference)?.toLocaleString()} - ${reason}`,
      data: { oldBalance, newBalance, reason, difference, transactionId },
      priority: "medium",
      actionUrl: "/account/wallet",
      actionText: "View Wallet",
    })
  }

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 20, category = null, read = null, sortBy = "createdAt", sortOrder = "desc" } = options

    const query = { userId }

    if (category) query.category = category
    if (read !== null) query.read = read

    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const skip = (page - 1) * limit

    const [notifications, total] = await Promise.all([
      Notification.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
    ])

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  // Mark notification as read
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true },
    )

    if (notification && this.io) {
      this.io.to(`user_${userId}`).emit("notification:read", { notificationId })
    }

    return notification
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    const result = await Notification.markAllAsRead(userId)

    if (this.io) {
      this.io.to(`user_${userId}`).emit("notification:all_read")
    }

    return result
  }

  // Get unread count
  async getUnreadCount(userId) {
    return await Notification.getUnreadCount(userId)
  }

  // Delete notification
  async deleteNotification(userId, notificationId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    })

    if (notification && this.io) {
      this.io.to(`user_${userId}`).emit("notification:deleted", { notificationId })
    }

    return notification
  }

  // Clear all notifications for user
  async clearAllNotifications(userId) {
    const result = await Notification.deleteMany({ userId })

    if (this.io) {
      this.io.to(`user_${userId}`).emit("notification:all_cleared")
    }

    return { deletedCount: result.deletedCount }
  }

  // Cleanup old notifications
  async cleanupOldNotifications(daysOld = 30) {
    return await Notification.cleanupOldNotifications(daysOld)
  }

  // Get notification by ID
  async getNotificationById(userId, notificationId) {
    return await Notification.findOne({
      _id: notificationId,
      userId,
    })
  }
}

const notificationService = new NotificationService()
export default notificationService
