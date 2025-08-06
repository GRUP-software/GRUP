import mongoose from "mongoose"
const { Schema } = mongoose

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  variant: { type: String },
  price: { type: Number, required: true },
  groupbuyId: { type: Schema.Types.ObjectId, ref: "GroupBuy" },
  groupStatus: {
    type: String,
    enum: ["forming", "secured", "dispatched"],
    default: "forming",
  },
})

const deliveryAddressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  phone: { type: String, required: true },
})

const orderProgressSchema = new Schema({
  status: {
    type: String,
    enum: [
      "pending",
      "groups_forming",
      "all_secured",
      "processing",
      "packaged",
      "dispatched",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ],
    default: "groups_forming",
  },
  timestamp: { type: Date, default: Date.now },
  message: String,
})

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],

    // Pricing breakdown
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    walletUsed: { type: Number, default: 0 },
    amountToPay: { type: Number, required: true },

    // Delivery information
    deliveryAddress: deliveryAddressSchema,
    estimatedDeliveryTime: Date,
    deliveryDistance: Number, // in kilometers

    // Order tracking
    progress: [orderProgressSchema],
    currentStatus: {
      type: String,
      enum: [
        "pending",
        "groups_forming",
        "all_secured",
        "processing",
        "packaged",
        "dispatched",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "groups_forming",
    },

    // Priority calculation
    priorityScore: { type: Number, default: 0 },
    allGroupsSecured: { type: Boolean, default: false },

    paymentMethod: { type: String, enum: ["wallet", "paypal", "card"], default: "wallet" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },

    // Delivery tracking
    trackingNumber: String,
    deliveryRoute: [
      {
        lat: Number,
        lng: Number,
        timestamp: Date,
        status: String,
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Calculate priority score
orderSchema.methods.calculatePriorityScore = function () {
  const securedItems = this.items.filter((item) => item.groupStatus === "secured").length
  const completionPercentage = securedItems / this.items.length
  const valueWeight = Math.min(this.totalAmount / 10000, 1) // Normalize to 0-1

  this.priorityScore = completionPercentage * 0.6 + valueWeight * 0.4
  return this.priorityScore
}

// Check if all groups are secured
orderSchema.methods.checkAllGroupsSecured = function () {
  this.allGroupsSecured = this.items.every((item) => item.groupStatus === "secured")
  if (this.allGroupsSecured && this.currentStatus === "groups_forming") {
    this.currentStatus = "all_secured"
    this.progress.push({
      status: "all_secured",
      message: "All group purchases secured! Order ready for processing.",
      timestamp: new Date(),
    })
  }
  return this.allGroupsSecured
}

const Order = mongoose.model("Order", orderSchema)
export default Order
