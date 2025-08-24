import Notification from "../models/Notification.js"
import logger from "../utils/logger.js"
import emailService from "./emailService.js"
import User from "../models/User.js"

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

  async notifyGroupBuyFailed(userId, productName, groupBuyId, progressPercentage, refundAmount = null) {
    const message = refundAmount 
      ? `Group buy for "${productName}" failed (${progressPercentage}% complete). Your payment of ₦${refundAmount.toLocaleString()} will be refunded to your wallet within 24 hours.`
      : `Group buy for "${productName}" failed (${progressPercentage}% complete). Your payment will be refunded to your wallet within 24 hours.`;
    
    return await this.createNotification({
      userId,
      type: "error",
      category: "group_buy",
      title: "Group Buy Failed",
      message,
      data: { productName, groupBuyId, progressPercentage, refundAmount },
      priority: "high",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })
  }

  async notifyGroupBuyStatusUpdate(userId, productName, groupBuyId, newStatus, oldStatus, fulfillmentData = null) {
    const statusMessages = {
      secured: `Great news! Your group buy for "${productName}" has been secured and is ready for processing.`,
      processing: `Your order for "${productName}" is now being processed!`,
      packaging: `Your order for "${productName}" is being packaged for delivery!`,
      ready_for_pickup: `Your order for "${productName}" is ready for pickup!`,
      delivered: `Your order for "${productName}" has been delivered!`,
      failed: `Unfortunately, your group buy for "${productName}" has failed. A refund will be processed to your wallet.`,
    }

    const message = statusMessages[newStatus] || `Your group buy status has been updated to ${newStatus}`

    return await this.createNotification({
      userId,
      type: newStatus === "failed" ? "error" : "success",
      category: "group_buy",
      title: newStatus === "failed" ? "Group Buy Failed" : "Group Buy Status Updated",
      message,
      data: { productName, groupBuyId, newStatus, oldStatus, fulfillmentData },
      priority: newStatus === "failed" ? "high" : "medium",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })
  }

  async notifyPartialOrderRefund(userId, productName, refundAmount, orderTrackingNumber) {
    const message = `Partial refund processed for "${productName}". ₦${refundAmount.toLocaleString()} has been refunded to your wallet. Your other items in order ${orderTrackingNumber} will be fulfilled as scheduled.`;
    
    return await this.createNotification({
      userId,
      type: "info",
      category: "order",
      title: "Partial Refund Processed",
      message,
      data: { productName, refundAmount, orderTrackingNumber },
      priority: "medium",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })
  }

  // Email notification methods
  async sendEmailNotification(userId, template, data) {
    try {
      const user = await User.findById(userId)
      if (!user || !user.email) {
        logger.warn(`📧 No email found for user ${userId}`)
        return { success: false, message: "User email not found" }
      }

      let subject, htmlContent

      // Check if email service is available
      if (!emailService || !emailService.isConfigured) {
        logger.warn(`📧 Email service not available for template: ${template}`)
        return { success: false, message: "Email service not configured" }
      }

      switch (template) {
        case 'order_status_update':
          subject = `Order Status Update - ${data.status}`
          htmlContent = emailService.generateOrderStatusEmail({
            ...data,
            customerName: user.name
          })
          break

        case 'group_buy_status_update':
          subject = `Group Buy Status Update - ${data.status}`
          htmlContent = emailService.generateGroupBuyStatusEmail({
            ...data,
            customerName: user.name
          })
          break

        case 'payment_confirmation':
          subject = 'Payment Confirmation - Grup'
          htmlContent = emailService.generatePaymentConfirmationEmail({
            ...data,
            customerName: user.name
          })
          break

        case 'refund_notification':
          subject = 'Refund Processed - Grup'
          htmlContent = emailService.generateRefundNotificationEmail({
            ...data,
            customerName: user.name
          })
          break

        case 'admin_action_notification':
          subject = `Admin Action - ${data.actionType}`
          htmlContent = emailService.generateAdminActionNotificationEmail({
            ...data,
            customerName: user.name
          })
          break

        default:
          logger.warn(`📧 Unknown email template: ${template}`)
          return { success: false, message: "Unknown email template" }
      }

      try {
        const result = await emailService.sendEmail(user.email, subject, htmlContent)
        
        if (result.success) {
          logger.info(`📧 Email sent successfully to ${user.email}: ${subject}`)
        } else {
          logger.error(`❌ Failed to send email to ${user.email}: ${result.error}`)
        }

        return result
      } catch (emailError) {
        logger.error(`❌ Email service error for user ${userId}:`, emailError)
        return { success: false, error: emailError.message }
      }
    } catch (error) {
      logger.error(`❌ Error sending email notification to user ${userId}:`, error)
      return { success: false, error: error.message }
    }
  }

  // Group buy status email notifications
  async sendGroupBuyStatusEmail(userId, status, productName, groupBuyId, fulfillmentData) {
    const emailData = {
      status,
      productName,
      groupBuyId,
      fulfillmentData,
      timestamp: new Date(),
    }

    return await this.sendEmailNotification(userId, "group_buy_status_update", emailData)
  }

  // Order status email notifications
  async sendOrderStatusEmail(userId, orderId, status, trackingNumber) {
    const emailData = {
      orderId,
      status,
      trackingNumber,
      timestamp: new Date(),
    }

    return await this.sendEmailNotification(userId, "order_status_update", emailData)
  }

  // Payment confirmation email
  async sendPaymentConfirmationEmail(userId, orderId, amount, trackingNumber) {
    const emailData = {
      orderId,
      amount,
      trackingNumber,
      timestamp: new Date(),
    }

    return await this.sendEmailNotification(userId, "payment_confirmation", emailData)
  }

  // Refund notification email
  async sendRefundNotificationEmail(userId, amount, reason, orderId) {
    const emailData = {
      amount,
      reason,
      orderId,
      timestamp: new Date(),
    }

    return await this.sendEmailNotification(userId, "refund_notification", emailData)
  }

  // Admin action notifications
  async notifyAdminOrderStatusUpdate(userId, orderData, status, message, adminName) {
    const notification = await this.createNotification({
      userId,
      type: "info",
      category: "order",
      title: `Order Status Updated by Admin`,
      message: `Order #${orderData.trackingNumber}: ${message}`,
      data: { 
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        status,
        message,
        adminName,
        actionType: 'order_status_update'
      },
      priority: "high",
      actionUrl: `/account/orders/${orderData.orderId}`,
      actionText: "View Details",
    })

    // Send email notification
    await this.sendEmailNotification(userId, "admin_action_notification", {
      actionType: 'order_status_update',
      actionDetails: {
        title: 'Order Status Updated',
        description: message,
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        status
      },
      adminName,
      timestamp: new Date()
    })

    return notification
  }

  async notifyAdminGroupBuyStatusUpdate(userId, productName, groupBuyId, newStatus, oldStatus, adminName, fulfillmentData = null) {
    const statusMessages = {
      'secured': 'Your group buy has been secured and is ready for processing!',
      'processing': 'Your order is now being processed!',
      'packaging': 'Your order is being packaged for delivery!',
      'ready_for_pickup': 'Your order is ready for pickup!',
      'delivered': 'Your order has been delivered!',
      'failed': 'Unfortunately, your group buy has failed. A refund will be processed to your wallet.'
    }

    const message = statusMessages[newStatus] || `Your group buy status has been updated to ${newStatus}`

    const notification = await this.createNotification({
      userId,
      type: newStatus === "failed" ? "error" : "success",
      category: "group_buy",
      title: `Group Buy Status Updated by Admin`,
      message: `Group buy for "${productName}": ${message}`,
      data: { 
        productName, 
        groupBuyId, 
        newStatus, 
        oldStatus, 
        fulfillmentData,
        adminName,
        actionType: 'group_buy_status_update'
      },
      priority: newStatus === "failed" ? "high" : "medium",
      actionUrl: `/account/orders`,
      actionText: "View Orders",
    })

    // Send email notification
    await this.sendEmailNotification(userId, "admin_action_notification", {
      actionType: 'group_buy_status_update',
      actionDetails: {
        title: 'Group Buy Status Updated',
        description: message,
        productName,
        groupBuyId,
        newStatus,
        oldStatus,
        fulfillmentData
      },
      adminName,
      timestamp: new Date()
    })

    return notification
  }

  async notifyAdminOrderCancellation(userId, orderData, reason, adminName) {
    const notification = await this.createNotification({
      userId,
      type: "error",
      category: "order",
      title: "Order Cancelled by Admin",
      message: `Order #${orderData.trackingNumber} has been cancelled: ${reason}`,
      data: { 
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        reason,
        adminName,
        actionType: 'order_cancelled'
      },
      priority: "high",
      actionUrl: `/account/orders/${orderData.orderId}`,
      actionText: "View Details",
    })

    // Send email notification
    await this.sendEmailNotification(userId, "admin_action_notification", {
      actionType: 'order_cancelled',
      actionDetails: {
        title: 'Order Cancelled',
        description: `Your order has been cancelled: ${reason}`,
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        reason
      },
      adminName,
      timestamp: new Date()
    })

    return notification
  }

  async notifyAdminRefundProcessed(userId, amount, reason, orderId, adminName) {
    const notification = await this.createNotification({
      userId,
      type: "info",
      category: "wallet",
      title: "Refund Processed by Admin",
      message: `Refund of ₦${amount?.toLocaleString()} processed: ${reason}`,
      data: { 
        amount, 
        reason, 
        orderId,
        adminName,
        actionType: 'refund_processed'
      },
      priority: "high",
      actionUrl: "/account/wallet",
      actionText: "View Wallet",
    })

    // Send email notification
    await this.sendEmailNotification(userId, "admin_action_notification", {
      actionType: 'refund_processed',
      actionDetails: {
        title: 'Refund Processed',
        description: `A refund of ₦${amount?.toLocaleString()} has been processed: ${reason}`,
        amount,
        reason,
        orderId
      },
      adminName,
      timestamp: new Date()
    })

    return notification
  }

  async notifyAdminDeliveryScheduled(userId, orderData, deliveryInfo, adminName) {
    const notification = await this.createNotification({
      userId,
      type: "success",
      category: "order",
      title: "Delivery Scheduled by Admin",
      message: `Delivery scheduled for order #${orderData.trackingNumber}: ${deliveryInfo}`,
      data: { 
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        deliveryInfo,
        adminName,
        actionType: 'delivery_scheduled'
      },
      priority: "high",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "Track Delivery",
    })

    // Send email notification
    await this.sendEmailNotification(userId, "admin_action_notification", {
      actionType: 'delivery_scheduled',
      actionDetails: {
        title: 'Delivery Scheduled',
        description: `Delivery has been scheduled for your order: ${deliveryInfo}`,
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        deliveryInfo
      },
      adminName,
      timestamp: new Date()
    })

    return notification
  }

  async notifyAdminPickupReady(userId, orderData, pickupLocation, adminName) {
    const notification = await this.createNotification({
      userId,
      type: "success",
      category: "order",
      title: "Order Ready for Pickup",
      message: `Order #${orderData.trackingNumber} is ready for pickup at ${pickupLocation}`,
      data: { 
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        pickupLocation,
        adminName,
        actionType: 'pickup_ready'
      },
      priority: "high",
      actionUrl: `/track/${orderData.trackingNumber}`,
      actionText: "View Pickup Details",
    })

    // Send email notification
    await this.sendEmailNotification(userId, "admin_action_notification", {
      actionType: 'pickup_ready',
      actionDetails: {
        title: 'Order Ready for Pickup',
        description: `Your order is ready for pickup at ${pickupLocation}`,
        orderId: orderData.orderId,
        trackingNumber: orderData.trackingNumber,
        pickupLocation
      },
      adminName,
      timestamp: new Date()
    })

    return notification
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
