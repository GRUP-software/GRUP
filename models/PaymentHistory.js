import mongoose from 'mongoose';

const { Schema } = mongoose;

const paymentHistorySchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  referenceId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  
  paystackReference: { 
    type: String 
  },
  
  cartItems: [{
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true 
    },
    price: { 
      type: Number, 
      required: true 
    }
  }],
  
  amount: { 
    type: Number, 
    required: true 
  },
  
  walletUsed: { 
    type: Number, 
    default: 0 
  },
  
  paystackAmount: { 
    type: Number, 
    required: true 
  },
  
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  
  groupBuysCreated: [{
    type: Schema.Types.ObjectId,
    ref: 'GroupBuy'
  }],
  
  paymentMethod: {
    type: String,
    enum: ['paystack', 'wallet_only'],
    default: 'paystack'
  },
  
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);
export default PaymentHistory;
