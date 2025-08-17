import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionSchema = new Schema({
  wallet: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Add user reference

  type: {
    type: String,
    enum: ['credit', 'debit'], // Valid types
    required: true,
  },

  amount: {
    type: Number,
    required: true,
  },

  reason: {
    type: String,
    enum: ['ORDER', 'REFUND', 'REFERRAL_BONUS'], // Valid reasons
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  // Additional metadata for better tracking
  metadata: {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    paymentHistoryId: { type: Schema.Types.ObjectId, ref: 'PaymentHistory' },
    referralCount: { type: Number }, // For referral bonuses
    groupBuyId: { type: Schema.Types.ObjectId, ref: 'GroupBuy' },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for better query performance
transactionSchema.index({ wallet: 1, createdAt: -1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ reason: 1, type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
