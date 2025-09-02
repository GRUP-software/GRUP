import mongoose from "mongoose";

const paymentHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    flutterwaveReference: {
      type: String,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    cartItems: [
      {
        productId: {
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
        sellingUnit: {
          optionName: String,
          displayName: String,
          baseUnitQuantity: Number,
          baseUnitName: String,
          pricePerUnit: Number,
          originalPricePerUnit: Number,
          totalBaseUnits: Number,
          savingsPerUnit: Number,
        },
      },
    ],
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    walletUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    flutterwaveAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    groupBuysCreated: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupBuy",
      },
    ],
    metadata: {
      deliveryAddress: {
        street: String,
        city: String,
        state: String,
        phone: String,
      },
      // Additional metadata can be stored here
      custom: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
paymentHistorySchema.index({ userId: 1, createdAt: -1 });
paymentHistorySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("PaymentHistory", paymentHistorySchema);
