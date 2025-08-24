import mongoose from 'mongoose';
import User from './models/User.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';

async function forceBonusFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grup');
    
    // Get all users to find the correct one
    const users = await User.find({}).select('email referredUsers referralStats');
    console.log('Available users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Referrals: ${user.referredUsers?.length || 0}`);
    });
    
    // Find user with 9 referrals (based on your description)
    const targetUser = users.find(user => (user.referredUsers?.length || 0) === 9);
    
    if (!targetUser) {
      console.log('No user found with 9 referrals');
      return;
    }
    
    console.log(`\nFound target user: ${targetUser.email}`);
    console.log('Total Referrals:', targetUser.referredUsers?.length || 0);
    console.log('Last Bonus At:', targetUser.referralStats?.lastBonusAt || 0);
    
    const wallet = await Wallet.findOne({ user: targetUser._id });
    console.log('Current Wallet Balance:', wallet.balance);
    
    // Calculate missing bonuses
    const totalReferrals = targetUser.referredUsers?.length || 0;
    const lastBonusAt = targetUser.referralStats?.lastBonusAt || 0;
    const newReferrals = totalReferrals - lastBonusAt;
    const completeSets = Math.floor(newReferrals / 3);
    
    console.log(`\nAnalysis:`);
    console.log(`- Total referrals: ${totalReferrals}`);
    console.log(`- Last bonus at: ${lastBonusAt}`);
    console.log(`- New referrals since last bonus: ${newReferrals}`);
    console.log(`- Complete sets of 3: ${completeSets}`);
    
    if (completeSets > 0) {
      const bonusAmount = completeSets * 500;
      console.log(`\n🎁 Processing ${completeSets} missing bonus(es) worth ₦${bonusAmount}`);
      
      // Add bonus to wallet
      wallet.balance += bonusAmount;
      await wallet.save();
      
      // Create transaction record
      const transaction = await Transaction.create({
        wallet: wallet._id,
        user: targetUser._id,
        type: "credit",
        amount: bonusAmount,
        reason: "REFERRAL_BONUS",
        description: `Manual referral bonus fix for ${totalReferrals} referrals (${completeSets} sets)`,
        metadata: {
          referralCount: totalReferrals,
          isManualFix: true
        }
      });
      
      // Update user referral stats
      targetUser.referralStats.lastBonusAt = totalReferrals;
      targetUser.referralStats.totalBonusesEarned = (targetUser.referralStats.totalBonusesEarned || 0) + bonusAmount;
      await targetUser.save();
      
      console.log(`✅ Successfully added ₦${bonusAmount} to wallet`);
      console.log(`✅ New wallet balance: ₦${wallet.balance}`);
      console.log(`✅ Transaction created: ${transaction._id}`);
      console.log(`✅ User stats updated: lastBonusAt = ${totalReferrals}`);
    } else {
      console.log('\n❌ No missing bonuses to process');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

forceBonusFix();






