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
      default: 20,
      min: 1,
    },

    status: {
      type: String,
      enum: ["active", "successful", "manual_review", "fulfilled", "failed"],
      default: "active",
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from creation
    },

    paymentHistories: [
      {
        type: Schema.Types.ObjectId,
        ref: "PaymentHistory",
      },
    ],

    adminNotes: {
      type: String,
      default: "",
    },

    manualReviewData: {
      reviewedAt: Date,
      reviewedBy: String,
      reviewNotes: String,
      recommendedAction: {
        type: String,
        enum: ["approve", "reject", "pending"],
        default: "pending",
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

// Enhanced method to add or update participant
groupBuySchema.methods.addOrUpdateParticipant = function (userId, quantity, amount, paymentHistoryId) {
  console.log(`Adding/updating participant: User ${userId}, Quantity: ${quantity}, Amount: ${amount}`)

  // Find existing participant
  const existingParticipant = this.participants.find((p) => p.userId.toString() === userId.toString())

  if (existingParticipant) {
    // Update existing participant
    existingParticipant.quantity += quantity
    existingParticipant.amount += amount
    existingParticipant.paymentHistories.push(paymentHistoryId)
  } else {
    // Add new participant
    this.participants.push({
      userId,
      quantity,
      amount,
      paymentHistories: [paymentHistoryId],
    })
  }

  // Update totals
  this.unitsSold += quantity
  this.totalAmountCollected += amount

  // Add to payment histories array
  if (!this.paymentHistories.includes(paymentHistoryId)) {
    this.paymentHistories.push(paymentHistoryId)
  }

  // Update status if MVU reached
  if (this.unitsSold >= this.minimumViableUnits && this.status === "active") {
    this.status = "successful"
  }

  this.updatedAt = new Date()
}

// Method to get progress percentage
groupBuySchema.methods.getProgressPercentage = function () {
  return Math.round((this.unitsSold / this.minimumViableUnits) * 100)
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

// Method to prepare for manual review
groupBuySchema.methods.prepareForManualReview = function () {
  this.status = "manual_review"
  this.manualReviewData.reviewedAt = new Date()

  // Set recommendation based on progress
  const progressPercentage = this.getProgressPercentage()
  if (progressPercentage >= 90) {
    this.manualReviewData.recommendedAction = "approve"
    this.manualReviewData.reviewNotes = `High completion rate: ${progressPercentage}% (${this.unitsSold}/${this.minimumViableUnits} units)`
  } else if (progressPercentage >= 70) {
    this.manualReviewData.recommendedAction = "approve"
    this.manualReviewData.reviewNotes = `Good completion rate: ${progressPercentage}% (${this.unitsSold}/${this.minimumViableUnits} units) - Consider approval`
  } else {
    this.manualReviewData.recommendedAction = "pending"
    this.manualReviewData.reviewNotes = `Low completion rate: ${progressPercentage}% (${this.unitsSold}/${this.minimumViableUnits} units) - Requires review`
  }

  this.updatedAt = new Date()
}

// Pre-save middleware
groupBuySchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

// Static method to create group buy with admin-set MVU
groupBuySchema.statics.createWithMVU = function (productId, minimumViableUnits = 20) {
  return new this({
    productId,
    minimumViableUnits,
    status: "active",
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  })
}

// Indexes for better performance
groupBuySchema.index({ productId: 1, status: 1 })
groupBuySchema.index({ expiresAt: 1 })
groupBuySchema.index({ status: 1 })
groupBuySchema.index({ "participants.userId": 1 })

const GroupBuy = mongoose.model("GroupBuy", groupBuySchema)

export default GroupBuy
