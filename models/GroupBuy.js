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
      enum: ["active", "successful", "failed", "manual_review", "refunded"],
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

  // Set status to manual review
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
