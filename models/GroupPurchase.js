import mongoose from "mongoose"

const { Schema } = mongoose

const participantSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  quantity: Number,
  joinedAt: { type: Date, default: Date.now },
})

const groupPurchaseSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  requiredQty: Number, // Total stock available for this group
  currentQty: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["forming", "secured", "dispatched", "expired"],
    default: "forming",
  },
  participants: [participantSchema],

  // Auto-secure tracking
  autoSecured: { type: Boolean, default: false },
  securedAt: Date,

  // Progress tracking
  progressPercentage: { type: Number, default: 0 },
  unitsRemaining: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => Date.now() + 48 * 3600 * 1000 }, // 48 hours later
})

// Calculate progress and check for auto-secure
groupPurchaseSchema.methods.updateProgress = function () {
  this.progressPercentage = (this.currentQty / this.requiredQty) * 100
  this.unitsRemaining = Math.max(0, this.requiredQty - this.currentQty)

  // Auto-secure if reached 100% of stock
  if (this.currentQty >= this.requiredQty && this.status === "forming") {
    this.status = "secured"
    this.autoSecured = true
    this.securedAt = new Date()
  }

  return this
}

// Get participant count
groupPurchaseSchema.virtual("participantCount").get(function () {
  return this.participants.length
})

const GroupPurchase = mongoose.model("GroupPurchase", groupPurchaseSchema)
export default GroupPurchase
