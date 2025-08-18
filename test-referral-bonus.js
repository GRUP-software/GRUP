import mongoose from 'mongoose';
import User from './models/User.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';
import { processReferralBonus } from './utils/referralBonusService.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grup');

const userId = '68a1215dde312fee0c95c863'; // Your user ID

console.log('🔍 Testing referral bonus for user:', userId);

// Get user details
const user = await User.findById(userId);
if (!user) {
  console.log('❌ User not found');
  process.exit(1);
}

console.log('👤 User found:', user.email);
console.log('📊 Referral stats:', {
  totalReferrals: user.referredUsers?.length || 0,
  lastBonusAt: user.referralStats?.lastBonusAt || 0,
  nextBonusAt: user.referralStats?.nextBonusAt || 3
});

// Get current wallet balance
const wallet = await Wallet.findOne({ user: userId });
console.log('💰 Current wallet balance:', wallet?.balance || 0);

// Get referral transactions
const referralTransactions = await Transaction.find({
  wallet: wallet?._id,
  reason: 'REFERRAL_BONUS',
  type: 'credit'
});

console.log('🎁 Referral bonus transactions:', referralTransactions.length);
referralTransactions.forEach(tx => {
  console.log(`  - ${tx.amount} on ${tx.createdAt}`);
});

// Process referral bonus
console.log('\n🔄 Processing referral bonus...');
const result = await processReferralBonus(userId);

console.log('📋 Result:', result);

// Check wallet balance after processing
const updatedWallet = await Wallet.findOne({ user: userId });
console.log('💰 Updated wallet balance:', updatedWallet?.balance || 0);

// Get updated referral transactions
const updatedReferralTransactions = await Transaction.find({
  wallet: wallet?._id,
  reason: 'REFERRAL_BONUS',
  type: 'credit'
});

console.log('🎁 Updated referral bonus transactions:', updatedReferralTransactions.length);

process.exit(0);

