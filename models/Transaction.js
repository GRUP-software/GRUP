import mongoose from 'mongoose';

const { Schema } = mongoose;

const transactionSchema = new Schema({
  wallet: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true },

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
    enum: ['ORDER', 'REFUND', 'REFERRAL_BONUS'], // Added referral
    required: true,
  },

  description: {
    type: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
