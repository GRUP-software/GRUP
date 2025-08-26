import mongoose from "mongoose"

const { Schema } = mongoose

// Enhanced participant schema to track individual user contributions
const participantSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentHistories: [
      {
        type: Schema.Types.ObjectId,
        ref: "PaymentHistory",
      },
    ],
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

const groupBuySchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Enhanced participants with detailed tracking
    participants: [participantSchema],

    unitsSold: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Admin-configurable MVU (no default hardcoded value)
    minimumViableUnits: {
      type: Number,
      required: true,
      default: 20,
    },

    totalAmountCollected: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "successful", "secured", "processing", "packaging", "ready_for_pickup", "delivered", "failed", "manual_review", "refunded"],
      default: "active",
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from creation
    },

    paymentHistories: [
      {
        type: Schema.Types.ObjectId,
        ref: "PaymentHistory",
      },
    ],

    manualReviewData: {
      reviewedBy: String,
      reviewedAt: Date,
      adminNotes: String,
      recommendedAction: {
        type: String,
        enum: ["approve", "reject", "pending"],
        default: "pending",
      },
    },

    adminNotes: String,

    // Admin tracking fields
    adminStatusHistory: [
      {
        status: String,
        changedBy: String,
        changedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],

    // WhatsApp integration tracking
    whatsappMessages: [
      {
        messageId: String,
        orderId: {
          type: Schema.Types.ObjectId,
          ref: "Order"
        },
        trackingNumber: String,
        type: {
          type: String,
          enum: ["fulfillment_choice", "confirmation", "help", "reminder"]
        },
        sentAt: {
          type: Date,
          default: Date.now
        },
        status: {
          type: String,
          enum: ["sent", "delivered", "read", "failed"],
          default: "sent"
        },
        responseReceived: {
          type: Boolean,
          default: false
        },
        responseChoice: {
          type: String,
          enum: ["pickup", "delivery"]
        },
        responseAt: Date,
        customerPhone: String
      }
    ],

    // Fulfillment tracking
    fulfillmentData: {
      processingStartedAt: Date,
      packagingStartedAt: Date,
      readyForPickupAt: Date,
      deliveredAt: Date,
      adminNotes: String,
      trackingNumber: String,
      deliveryMethod: {
        type: String,
        enum: ["pickup", "delivery"],
      },
      pickupLocation: String,
      deliveryAddress: {
        street: String,
        city: String,
        state: String,
        phone: String,
      },
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
)

// Enhanced method to add or update participant with race condition protection
groupBuySchema.methods.addOrUpdateParticipant = function (userId, quantity, amount, paymentHistoryId) {
  console.log(`Adding/updating participant: User ${userId}, Quantity: ${quantity}, Amount: ${amount}`)

  // Find existing participant
  const existingParticipant = this.participants.find((p) => p.userId.toString() === userId.toString())

  if (existingParticipant) {
    // Update existing participant
    existingParticipant.quantity += quantity
    existingParticipant.amount += amount
    existingParticipant.paymentHistories.push(paymentHistoryId)
    console.log(
      `Updated existing participant: Total quantity now ${existingParticipant.quantity}, Total amount now ${existingParticipant.amount}`,
    )
  } else {
    // Add new participant
    this.participants.push({
      userId,
      quantity,
      amount,
      paymentHistories: [paymentHistoryId],
      joinedAt: new Date(),
    })
    console.log(`Added new participant: User ${userId}`)
  }

  // Update totals
  this.unitsSold += quantity
  this.totalAmountCollected += amount

  // Add to payment histories array (avoid duplicates)
  if (!this.paymentHistories.includes(paymentHistoryId)) {
    this.paymentHistories.push(paymentHistoryId)
  }

  // Update status if MVU reached
  if (this.unitsSold >= this.minimumViableUnits && this.status === "active") {
    this.status = "successful"
    console.log(`GroupBuy ${this._id} reached MVU and marked as successful`)
    
    // Set a flag to indicate notifications should be sent
    this._shouldSendNotifications = true;
    this._notificationData = {
      productId: this.productId,
      participants: this.participants.map(p => p.userId),
      groupBuyId: this._id
    };
  }

  this.updatedAt = new Date()
}

// Method to get progress percentage
groupBuySchema.methods.getProgressPercentage = function () {
  return Math.min((this.unitsSold / this.minimumViableUnits) * 100, 100)
}

// Method to check if expired
groupBuySchema.methods.isExpired = function () {
  return new Date() > this.expiresAt
}

// Method to get participant by user ID
groupBuySchema.methods.getParticipant = function (userId) {
  return this.participants.find((p) => p.userId.toString() === userId.toString())
}

// Method to get total participants count
groupBuySchema.methods.getParticipantCount = function () {
  return this.participants.length
}

// Method to check if GroupBuy can accept more participants
groupBuySchema.methods.canAcceptMoreParticipants = function () {
  // Can accept more if:
  // 1. Status is active or successful
  // 2. Not expired
  // 3. Has not reached a maximum limit (if any)
  return (
    (this.status === "active" || this.status === "successful") &&
    !this.isExpired() &&
    this.unitsSold < this.minimumViableUnits * 2 // Allow up to 2x the MVU
  )
}

// Method to prepare GroupBuy for manual review when expired
groupBuySchema.methods.prepareForManualReview = function () {
  const progressPercentage = this.getProgressPercentage()

  // Only move to manual review if it's a failed group buy (didn't reach MVU)
  if (this.unitsSold >= this.minimumViableUnits) {
    // This is a successful group buy, keep it as successful even after expiry
    this.status = "successful"
    this.adminNotes = `Successful GroupBuy expired (${this.unitsSold}/${this.minimumViableUnits} units, ${progressPercentage.toFixed(1)}%). Ready for order processing.`
    return
  }

  // Set status to manual review for failed group buys
  this.status = "manual_review"

  // Set up manual review data based on completion status
  this.manualReviewData = {
    reviewedBy: null,
    reviewedAt: null,
    adminNotes: null,
    recommendedAction: progressPercentage >= 80 ? "approve" : progressPercentage >= 50 ? "pending" : "reject",
  }

  // Set review notes based on progress
  if (progressPercentage >= 80) {
    this.adminNotes = `GroupBuy expired with high completion (${this.unitsSold}/${this.minimumViableUnits} units, ${progressPercentage.toFixed(1)}%). Recommended for approval.`
  } else if (progressPercentage >= 50) {
    this.adminNotes = `GroupBuy expired with moderate completion (${this.unitsSold}/${this.minimumViableUnits} units, ${progressPercentage.toFixed(1)}%). Requires admin decision.`
  } else {
    this.adminNotes = `GroupBuy expired with low completion (${this.unitsSold}/${this.minimumViableUnits} units, ${progressPercentage.toFixed(1)}%). Recommended for rejection/refund.`
  }

  this.updatedAt = new Date()
}

// Method to update status with admin tracking
groupBuySchema.methods.updateStatus = function (newStatus, adminName, notes = "") {
  const oldStatus = this.status
  this.status = newStatus
  
  // Add to admin status history
  this.adminStatusHistory.push({
    status: newStatus,
    changedBy: adminName,
    changedAt: new Date(),
    notes: notes,
    notificationSent: false,
  })

  // Update fulfillment timestamps based on status
  if (newStatus === "processing" && !this.fulfillmentData.processingStartedAt) {
    this.fulfillmentData.processingStartedAt = new Date()
  } else if (newStatus === "packaging" && !this.fulfillmentData.packagingStartedAt) {
    this.fulfillmentData.packagingStartedAt = new Date()
  } else if (newStatus === "ready_for_pickup" && !this.fulfillmentData.readyForPickupAt) {
    this.fulfillmentData.readyForPickupAt = new Date()
  } else if (newStatus === "delivered" && !this.fulfillmentData.deliveredAt) {
    this.fulfillmentData.deliveredAt = new Date()
  }

  this.updatedAt = new Date()
  
  // Return the old status for comparison
  return oldStatus
}

// Method to get the latest admin status change
groupBuySchema.methods.getLatestStatusChange = function () {
  if (this.adminStatusHistory.length === 0) return null
  return this.adminStatusHistory[this.adminStatusHistory.length - 1]
}

// Method to check if status change requires notification
groupBuySchema.methods.requiresNotification = function (newStatus) {
  const notificationStatuses = ["secured", "processing", "packaging", "ready_for_pickup", "delivered", "failed", "refunded"]
  return notificationStatuses.includes(newStatus)
}

// Pre-save middleware
groupBuySchema.pre("save", function (next) {
  // Ensure participants have required fields
  for (const participant of this.participants) {
    if (!participant.userId) {
      return next(new Error("Participant userId is required"))
    }
    if (!participant.quantity || participant.quantity <= 0) {
      return next(new Error("Participant quantity must be a positive number"))
    }
    if (participant.amount === undefined || participant.amount < 0) {
      return next(new Error("Participant amount must be a non-negative number"))
    }
  }

  // Recalculate totals to ensure consistency
  this.unitsSold = this.participants.reduce((total, p) => total + p.quantity, 0)
  this.totalAmountCollected = this.participants.reduce((total, p) => total + p.amount, 0)

  // Update timestamp
  this.updatedAt = new Date()

  // Check if expired and should be moved to manual review
  if (this.isExpired() && this.status === "active" && this.unitsSold < this.minimumViableUnits) {
    this.status = "manual_review"
    this.adminNotes = `Expired without reaching MVU (${this.unitsSold}/${this.minimumViableUnits} units). Awaiting admin decision.`
  }

  next()
})

// Post-save middleware to handle notifications
groupBuySchema.post("save", async function(doc) {
  // Check if notifications should be sent for successful group buys
  if (doc._shouldSendNotifications && doc._notificationData) {
    try {
      const notificationService = (await import('../services/notificationService.js')).default;
      const Product = (await import('./Product.js')).default;
      
      // Get product details for notification
      const product = await Product.findById(doc._notificationData.productId);
      const productName = product?.title || 'Product';
      
      // Notify all participants
      for (const participantId of doc._notificationData.participants) {
        await notificationService.notifyGroupBuySecured(
          participantId,
          productName,
          doc._notificationData.groupBuyId
        );
      }
      
      // Clear the flag and data
      doc._shouldSendNotifications = false;
      doc._notificationData = null;
    } catch (error) {
      console.error('Failed to send group buy secured notifications:', error);
    }
  }

  // Check if status changed to failed or manual_review and send notifications
  if (doc.isModified('status') && (doc.status === 'failed' || doc.status === 'manual_review')) {
    try {
      const notificationService = (await import('../services/notificationService.js')).default;
      const Product = (await import('./Product.js')).default;
      
      // Get product details for notification
      const product = await Product.findById(doc.productId);
      const productName = product?.title || 'Product';
      const progressPercentage = doc.getProgressPercentage();
      
      // Notify all participants about the failure
      for (const participant of doc.participants) {
        await notificationService.notifyGroupBuyFailed(
          participant.userId,
          productName,
          doc._id,
          progressPercentage,
          participant.amount
        );
      }
    } catch (error) {
      console.error('Failed to send group buy failed notifications:', error);
    }
  }
})

// Static method to create group buy with admin-set MVU
groupBuySchema.statics.createWithMVU = function (productId, minimumViableUnits = 20) {
  return new this({
    productId,
    minimumViableUnits,
    totalAmountCollected: 0, // Initialize the field
    status: "active",
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  })
}

// Static method to find active GroupBuys for a product
groupBuySchema.statics.findActiveForProduct = function (productId) {
  return this.findOne({
    productId,
    status: { $in: ["active", "successful"] },
    expiresAt: { $gt: new Date() },
  }).populate("productId", "title price images category")
}

// Static method to find expired GroupBuys
groupBuySchema.statics.findExpiredForReview = function () {
  return this.find({
    status: "active",
    expiresAt: { $lte: new Date() },
    unitsSold: { $lt: this.minimumViableUnits },
  }).populate("productId", "title price")
}

// Indexes for better performance
groupBuySchema.index({ productId: 1, status: 1 })
groupBuySchema.index({ status: 1, expiresAt: 1 })
groupBuySchema.index({ "participants.userId": 1 })

const GroupBuy = mongoose.model("GroupBuy", groupBuySchema)

export default GroupBuy
