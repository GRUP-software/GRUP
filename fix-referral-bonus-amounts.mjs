import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';

// Load environment variables
dotenv.config();

async function fixReferralBonusAmounts() {
  try {
    console.log('🔧 Fixing referral bonus amounts...');
    
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
      
      console.log(`💳 Current wallet balance: ₦${wallet.balance}`);
      
      // Get all referral bonus transactions
      const referralTransactions = await Transaction.find({
        wallet: wallet._id,
        reason: "REFERRAL_BONUS",
        type: "credit"
      }).sort({ createdAt: 1 });
      
      console.log(`🎁 Found ${referralTransactions.length} referral bonus transactions`);
      
      // Calculate what should be given
      const totalReferrals = user.referredUsers.length;
      const shouldBeGiven = Math.floor(totalReferrals / 3) * 500;
      
      // Calculate what was actually given
      const totalBonusGiven = referralTransactions.reduce((total, tx) => total + tx.amount, 0);
      
      console.log(`💰 Total bonus given: ₦${totalBonusGiven}`);
      console.log(`📈 Should be given: ₦${shouldBeGiven}`);
      
      if (totalBonusGiven !== shouldBeGiven) {
        console.log(`⚠️ MISMATCH DETECTED! Fixing...`);
        
        // Calculate the difference
        const difference = shouldBeGiven - totalBonusGiven;
        
        if (difference > 0) {
          // Need to add more bonus
          console.log(`➕ Adding ₦${difference} to wallet`);
          wallet.balance += difference;
          
          // Create correction transaction
          const correctionTransaction = await Transaction.create({
            wallet: wallet._id,
            user: user._id,
            type: "credit",
            amount: difference,
            reason: "REFERRAL_BONUS_CORRECTION",
            description: `Referral bonus correction for ${totalReferrals} referrals (should be ₦${shouldBeGiven}, was ₦${totalBonusGiven})`,
            metadata: {
              referralCount: totalReferrals,
              isCorrection: true,
              originalAmount: totalBonusGiven,
              correctedAmount: shouldBeGiven
            }
          });
          
          console.log(`📝 Created correction transaction: ${correctionTransaction._id}`);
        } else if (difference < 0) {
          // Need to remove excess bonus
          console.log(`➖ Removing ₦${Math.abs(difference)} from wallet`);
          wallet.balance += difference; // difference is negative, so this subtracts
          
          // Create correction transaction
          const correctionTransaction = await Transaction.create({
            wallet: wallet._id,
            user: user._id,
            type: "debit",
            amount: Math.abs(difference),
            reason: "REFERRAL_BONUS_CORRECTION",
            description: `Referral bonus correction for ${totalReferrals} referrals (should be ₦${shouldBeGiven}, was ₦${totalBonusGiven})`,
            metadata: {
              referralCount: totalReferrals,
              isCorrection: true,
              originalAmount: totalBonusGiven,
              correctedAmount: shouldBeGiven
            }
          });
          
          console.log(`📝 Created correction transaction: ${correctionTransaction._id}`);
        }
        
        // Save wallet
        await wallet.save();
        console.log(`✅ Wallet balance updated to: ₦${wallet.balance}`);
        
      } else {
        console.log(`✅ Bonus amounts are correct`);
      }
      
      console.log('─'.repeat(50));
    }
    
    await mongoose.disconnect();
    console.log('✅ Fix completed');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    await mongoose.disconnect();
  }
}

// Run the fix
fixReferralBonusAmounts();




