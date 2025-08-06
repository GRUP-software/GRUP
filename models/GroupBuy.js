import mongoose from "mongoose"

const { Schema } = mongoose

const groupBuySchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    unitsSold: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "successful", "manual_review", "failed"],
      default: "active",
    },
    minimumViableUnits: { type: Number, default: 20 }, // Configurable MVU
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    },
    paymentHistories: [{ type: Schema.Types.ObjectId, ref: "PaymentHistory" }], // Track all payments in this group
    successfulAt: Date, // When MVU was reached
    reviewedAt: Date, // When moved to manual review
    adminNotes: String, // Admin notes for manual review
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
groupBuySchema.index({ productId: 1, status: 1 })
groupBuySchema.index({ expiresAt: 1 })
groupBuySchema.index({ status: 1, expiresAt: 1 })

// Method to check if group buy is viable
groupBuySchema.methods.checkViability = function () {
  if (this.unitsSold >= this.minimumViableUnits && this.status === "active") {
    this.status = "successful"
    this.successfulAt = new Date()
    return true
  }
  return false
}

// Method to add participant
groupBuySchema.methods.addParticipant = function (userId, quantity) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId)
  }
  this.unitsSold += quantity
  return this.checkViability()
}

const GroupBuy = mongoose.model("GroupBuy", groupBuySchema)
export default GroupBuy
