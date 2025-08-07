import mongoose from 'mongoose';

const { Schema } = mongoose;

const groupBuySchema = new Schema({
  productId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  
  participants: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  unitsSold: { 
    type: Number, 
    default: 0 
  },
  
  minimumViableUnits: { 
    type: Number, 
    default: 20 
  },
  
  status: {
    type: String,
    enum: ['active', 'successful', 'manual_review', 'failed'],
    default: 'active'
  },
  
  expiresAt: { 
    type: Date, 
    default: function() {
      // Check if in test mode
      const isTestMode = process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_');
      const duration = isTestMode ? 10 * 60 * 1000 : 48 * 60 * 60 * 1000; // 10 min vs 48 hours
      return new Date(Date.now() + duration);
    }
  },
  
  paymentHistories: [{
    type: Schema.Types.ObjectId,
    ref: 'PaymentHistory'
  }],
  
  adminNotes: {
    type: String
  },
  
  finalizedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Method to add participant
groupBuySchema.methods.addParticipant = function(userId, quantity) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
  }
  this.unitsSold += quantity;
  
  // Auto-mark as successful if MVU reached
  if (this.unitsSold >= this.minimumViableUnits && this.status === 'active') {
    this.status = 'successful';
  }
};

// Method to check if expired
groupBuySchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to get progress percentage
groupBuySchema.methods.getProgressPercentage = function() {
  return Math.round((this.unitsSold / this.minimumViableUnits) * 100);
};

const GroupBuy = mongoose.model('GroupBuy', groupBuySchema);
export default GroupBuy;
