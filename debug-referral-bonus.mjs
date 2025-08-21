import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';

// Load environment variables
dotenv.config();

async function debugReferralBonus() {
  try {
    console.log('🔍 Debugging referral bonus system...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Find all users with referrals
    const users = await User.find({}).populate('referredUsers');
    const usersWithReferrals = users.filter(user => user.referredUsers && user.referredUsers.length > 0);
    
    console.log(`📊 Found ${usersWithReferrals.length} users with referrals`);
    
    for (const user of usersWithReferrals) {
      console.log(`\n👤 User: ${user.email} (${user._id})`);
      console.log(`📊 Total referrals: ${user.referredUsers.length}`);
      
      // Get wallet
      const wallet = await Wallet.findOne({ user: user._id });
      if (!wallet) {
        console.log(`❌ No wallet found for user`);
        continue;
      }
      
      console.log(`💳 Wallet balance: ₦${wallet.balance}`);
      
      // Get all referral bonus transactions
      const referralTransactions = await Transaction.find({
        wallet: wallet._id,
        reason: "REFERRAL_BONUS",
        type: "credit"
      }).sort({ createdAt: 1 });
      
      console.log(`🎁 Found ${referralTransactions.length} referral bonus transactions:`);
      
      let totalBonusGiven = 0;
      referralTransactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. Amount: ₦${tx.amount}, Date: ${tx.createdAt}, Description: ${tx.description}`);
        totalBonusGiven += tx.amount;
      });
      
      console.log(`💰 Total bonus given: ₦${totalBonusGiven}`);
      
      // Calculate what should be given
      const totalReferrals = user.referredUsers.length;
      const shouldBeGiven = Math.floor(totalReferrals / 3) * 500;
      console.log(`📈 Should be given: ₦${shouldBeGiven} (${Math.floor(totalReferrals / 3)} complete sets of 3)`);
      
      if (totalBonusGiven !== shouldBeGiven) {
        console.log(`⚠️ MISMATCH! Given: ₦${totalBonusGiven}, Should be: ₦${shouldBeGiven}`);
      } else {
        console.log(`✅ Bonus amounts match correctly`);
      }
      
      console.log('─'.repeat(50));
    }
    
    await mongoose.disconnect();
    console.log('✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    await mongoose.disconnect();
  }
}

// Run the debug
debugReferralBonus();
