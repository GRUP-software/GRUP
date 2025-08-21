import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';
import { processReferralBonus, checkReferralBonusEligibility } from './utils/referralBonusService.js';

// Load environment variables
dotenv.config();

async function testReferralBonus() {
  try {
    console.log('🔧 Testing referral bonus processing...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Find a user with referrals to test
    const users = await User.find({}).populate('referredUsers');
    const usersWithReferrals = users.filter(user => user.referredUsers && user.referredUsers.length > 0);
    
    if (usersWithReferrals.length === 0) {
      console.log('❌ No users with referrals found. Please create some referrals first.');
      return;
    }
    
    console.log(`📊 Found ${usersWithReferrals.length} users with referrals`);
    
    for (const user of usersWithReferrals) {
      console.log(`\n🧪 Testing user: ${user.email} (${user._id})`);
      console.log(`📊 Total referrals: ${user.referredUsers.length}`);
      
      // Check eligibility
      const eligibility = await checkReferralBonusEligibility(user._id);
      console.log(`🎯 Eligibility: ${eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
      console.log(`💰 Bonus amount: ₦${eligibility.bonusAmount}`);
      
      if (eligibility.eligible) {
        // Get current wallet balance
        const wallet = await Wallet.findOne({ user: user._id });
        const oldBalance = wallet ? wallet.balance : 0;
        console.log(`💳 Current wallet balance: ₦${oldBalance}`);
        
        // Process bonus
        const result = await processReferralBonus(user._id);
        
        if (result.success) {
          console.log(`✅ Bonus processed successfully!`);
          console.log(`💰 New balance: ₦${result.newBalance}`);
          console.log(`📈 Balance increased by: ₦${result.bonusAmount}`);
          
          // Verify the transaction was created
          const transaction = await Transaction.findOne({
            user: user._id,
            reason: 'REFERRAL_BONUS',
            amount: result.bonusAmount
          }).sort({ createdAt: -1 });
          
          if (transaction) {
            console.log(`📝 Transaction verified: ${transaction._id}`);
          } else {
            console.log(`❌ Transaction not found!`);
          }
        } else {
          console.log(`❌ Bonus processing failed: ${result.message}`);
        }
      } else {
        console.log(`ℹ️ User not eligible: ${eligibility.reason}`);
      }
      
      console.log('─'.repeat(50));
    }
    
    await mongoose.disconnect();
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.disconnect();
  }
}

// Run the test
testReferralBonus();
