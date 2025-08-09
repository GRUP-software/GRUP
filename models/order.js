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
          enum: ["forming", "secured", "dispatched"],
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
  const allSecured = this.items.every((item) => item.groupStatus === "secured" || item.groupStatus === "dispatched")

  if (allSecured && !this.allGroupsSecured) {
    this.allGroupsSecured = true
    this.currentStatus = "all_secured"
    this.progress.push({
      status: "all_secured",
      message: "All group buys have been secured! Your order will be processed soon.",
      timestamp: new Date(),
    })
  }

  return allSecured
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

// Index for efficient queries
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ currentStatus: 1, priorityScore: -1 })
orderSchema.index({ allGroupsSecured: 1, createdAt: -1 })

export default mongoose.model("Order", orderSchema)
