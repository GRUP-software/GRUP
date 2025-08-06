import mongoose from "mongoose"

const { Schema } = mongoose

const paymentHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    referenceId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    cartItems: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Price at time of purchase
      },
    ],
    amount: { type: Number, required: true }, // Total amount
    walletUsed: { type: Number, default: 0 }, // Amount paid from wallet
    paystackAmount: { type: Number, required: true }, // Amount to be paid via Paystack
    paystackReference: { type: String },
    paystackData: { type: Schema.Types.Mixed }, // Store full Paystack response
    groupBuysCreated: [{ type: Schema.Types.ObjectId, ref: "GroupBuy" }], // Track created group buys
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
paymentHistorySchema.index({ referenceId: 1 })
paymentHistorySchema.index({ userId: 1, status: 1 })
paymentHistorySchema.index({ createdAt: -1 })

const PaymentHistory = mongoose.model("PaymentHistory", paymentHistorySchema)
export default PaymentHistory
