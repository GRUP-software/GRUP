import mongoose from "mongoose"

const orderSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentHistory",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        groupbuyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "GroupBuy",
        },
        groupStatus: {
          type: String,
          enum: ["forming", "secured", "processing", "packaging", "ready_for_pickup", "delivered", "dispatched", "under_review", "failed"],
          default: "forming",
        },
      },
    ],
    currentStatus: {
      type: String,
      enum: [
        "groups_forming",
        "all_secured",
        "processing",
        "packaged",
        "awaiting_fulfillment_choice",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "picked_up",
        "cancelled",
        "groups_under_review",
      ],
      default: "groups_forming",
      index: true,
    },
    allGroupsSecured: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      phone: String,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    walletUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    paystackAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    fulfillmentChoice: {
      type: String,
      enum: ["pickup", "delivery"],
    },
    estimatedFulfillmentTime: Date,
    priorityScore: {
      type: Number,
      default: 0,
      index: true,
    },
    progress: [
      {
        status: String,
        message: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Method to check if all groups are secured
orderSchema.methods.checkAllGroupsSecured = function () {
  // Check if all non-failed items are secured or in fulfillment process
  const nonFailedItems = this.items.filter(item => item.groupStatus !== "failed")
  const allSecured = nonFailedItems.length > 0 && nonFailedItems.every((item) => 
    ["secured", "processing", "packaging", "ready_for_pickup", "delivered", "dispatched"].includes(item.groupStatus)
  )

  if (allSecured && !this.allGroupsSecured) {
    this.allGroupsSecured = true
    this.currentStatus = "all_secured"
    this.progress.push({
      status: "all_secured",
      message: "All remaining group buys have been secured! Your order will be processed soon.",
      timestamp: new Date(),
    })
  }

  return allSecured
}

// Method to calculate the amount for items that are still active (not failed)
orderSchema.methods.getActiveOrderAmount = function () {
  return this.items
    .filter(item => item.groupStatus !== "failed")
    .reduce((total, item) => total + (item.price * item.quantity), 0)
}

// Method to get failed items
orderSchema.methods.getFailedItems = function () {
  return this.items.filter(item => item.groupStatus === "failed")
}

// Method to get successful items
orderSchema.methods.getSuccessfulItems = function () {
  return this.items.filter(item => item.groupStatus === "secured" || item.groupStatus === "dispatched")
}

// Method to calculate priority score for admin sorting
orderSchema.methods.calculatePriorityScore = function () {
  let score = 0

  // Higher priority for orders with all groups secured
  if (this.allGroupsSecured) score += 100

  // Higher priority for orders closer to fulfillment
  const statusPriority = {
    groups_forming: 10,
    all_secured: 80,
    processing: 70,
    packaged: 90,
    awaiting_fulfillment_choice: 85,
    ready_for_pickup: 60,
    out_for_delivery: 50,
    delivered: 0,
    picked_up: 0,
    cancelled: 0,
    groups_under_review: 20,
  }
  score += statusPriority[this.currentStatus] || 0

  // Higher priority for older orders (time-based urgency)
  const daysSinceCreated = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)
  score += Math.min(daysSinceCreated * 5, 50) // Max 50 points for age

  // Higher priority for higher value orders
  score += Math.min(this.totalAmount / 1000, 30) // Max 30 points for value

  this.priorityScore = Math.round(score)
  return this.priorityScore
}

orderSchema.post("save", async (doc) => {
  // Check if this is a status change that should trigger notification
  if (doc.isModified("currentStatus") || doc._statusChanged) {
    try {
      const notificationService = (await import("../services/notificationService.js")).default

      // Get status-specific messages with more detail
      const statusMessages = {
        groups_forming: "Your order has been created! Group buys are now forming for your items.",
        all_secured: "Excellent! All your group buys have been secured. Your order will be processed within 24 hours.",
        processing: "Your order is now being processed and prepared for fulfillment.",
        packaged:
          "Your order has been packaged and is ready for fulfillment. You'll receive pickup/delivery options soon.",
        awaiting_fulfillment_choice: "Please choose your preferred fulfillment method (pickup or delivery) to proceed.",
        ready_for_pickup: "Your order is ready for pickup at our location! Bring your tracking number.",
        out_for_delivery: "Your order is out for delivery and should arrive soon!",
        delivered: "Your order has been delivered successfully! Thank you for shopping with us.",
        picked_up: "Thank you for picking up your order! We hope you enjoy your purchase.",
        cancelled: "Your order has been cancelled. Any payments will be refunded to your wallet.",
        groups_under_review: "Some group buys in your order are under admin review. We'll update you within 24 hours.",
      }

      const message = statusMessages[doc.currentStatus] || `Order status updated to: ${doc.currentStatus}`

      await notificationService.notifyOrderStatusUpdate(
        doc.user,
        {
          orderId: doc._id,
          trackingNumber: doc.trackingNumber,
        },
        doc.currentStatus,
        message,
      )

      // Special handling for ready_for_pickup status
      if (doc.currentStatus === "ready_for_pickup") {
        await notificationService.notifyOrderReadyForPickup(
          doc.user,
          {
            orderId: doc._id,
            trackingNumber: doc.trackingNumber,
          },
          "Main Store Location - 123 Commerce Street", // You can make this configurable
        )
      }
    } catch (error) {
      console.error("Failed to send order status notification:", error)
    }
  }

  // Notify when all groups are secured
  if (doc.isModified("allGroupsSecured") && doc.allGroupsSecured) {
    try {
      const notificationService = (await import("../services/notificationService.js")).default

      await notificationService.createNotification({
        userId: doc.user,
        category: "order",
        type: "success",
        title: "All Group Buys Secured! 🎉",
        message: `Great news! All group buys for order ${doc.trackingNumber} have been secured. Your order will be processed soon.`,
        actionUrl: `/orders/track/${doc.trackingNumber}`,
        metadata: {
          orderId: doc._id,
          trackingNumber: doc.trackingNumber,
          totalAmount: doc.totalAmount,
          itemCount: doc.items.length,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error("Failed to send group secured notification:", error)
    }
  }
})

// Pre-save middleware to detect status changes and ensure required fields
orderSchema.pre("save", function (next) {
  // Ensure required fields exist
  if (!this.trackingNumber) {
    this.trackingNumber = `AUTO_${this._id ? this._id.toString().slice(-8) : Date.now().toString().slice(-8)}`;
  }
  
  if (!this.currentStatus) {
    this.currentStatus = 'groups_forming';
  }
  
  if (!this.items || !Array.isArray(this.items)) {
    this.items = [];
  }
  
  if (!this.progress || !Array.isArray(this.progress)) {
    this.progress = [];
  }
  
  if (this.isModified("currentStatus")) {
    this._statusChanged = true
    this._previousStatus = this._original?.currentStatus || this.currentStatus
  }
  next()
})

// Safe toJSON method to prevent AdminJS errors
orderSchema.methods.toJSON = function() {
  try {
    const obj = this.toObject();
    
    // Ensure all required fields exist
    if (!obj.trackingNumber) {
      obj.trackingNumber = `AUTO_${this._id ? this._id.toString().slice(-8) : Date.now().toString().slice(-8)}`;
    }
    
    if (!obj.currentStatus) {
      obj.currentStatus = 'groups_forming';
    }
    
    if (!obj.items || !Array.isArray(obj.items)) {
      obj.items = [];
    }
    
    if (!obj.progress || !Array.isArray(obj.progress)) {
      obj.progress = [];
    }
    
    if (!obj.totalAmount) {
      obj.totalAmount = 0;
    }
    
    if (!obj.walletUsed) {
      obj.walletUsed = 0;
    }
    
    if (!obj.paystackAmount) {
      obj.paystackAmount = 0;
    }
    
    if (!obj.priorityScore) {
      obj.priorityScore = 0;
    }
    
    if (!obj.allGroupsSecured) {
      obj.allGroupsSecured = false;
    }
    
    // Ensure all nested objects are properly initialized
    if (!obj.deliveryAddress) {
      obj.deliveryAddress = {};
    }
    
    if (!obj.fulfillmentChoice) {
      obj.fulfillmentChoice = 'pickup';
    }
    
    if (!obj.estimatedFulfillmentTime) {
      obj.estimatedFulfillmentTime = null;
    }
    
    if (!obj.paymentHistoryId) {
      obj.paymentHistoryId = null;
    }
    
    if (!obj.user) {
      obj.user = null;
    }
    
    return obj;
  } catch (error) {
    console.error('Error in Order toJSON method:', error);
    // Return a minimal valid object if toObject fails
    return {
      _id: this._id,
      trackingNumber: `AUTO_${this._id ? this._id.toString().slice(-8) : Date.now().toString().slice(-8)}`,
      currentStatus: 'groups_forming',
      items: [],
      progress: [],
      totalAmount: 0,
      walletUsed: 0,
      paystackAmount: 0,
      priorityScore: 0,
      allGroupsSecured: false,
      deliveryAddress: {},
      fulfillmentChoice: 'pickup',
      estimatedFulfillmentTime: null,
      paymentHistoryId: null,
      user: null,
      createdAt: this.createdAt || new Date(),
      updatedAt: this.updatedAt || new Date()
    };
  }
};

// Index for efficient queries
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ currentStatus: 1, priorityScore: -1 })
orderSchema.index({ allGroupsSecured: 1, createdAt: -1 })

export default mongoose.model("Order", orderSchema)
