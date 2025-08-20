import mongoose from 'mongoose';
import User from './models/User.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';

async function fixUserBonus() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grup');
    
    // Use the user ID from your server logs
    const userId = '68a1215dde312fee0c95c863';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found with ID:', userId);
      return;
    }
    
    console.log('Found user:', user.email);
    console.log('Total Referrals:', user.referredUsers?.length || 0);
    console.log('Last Bonus At:', user.referralStats?.lastBonusAt || 0);
    console.log('Total Bonuses Earned:', user.referralStats?.totalBonusesEarned || 0);
    
    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      console.log('Wallet not found for user');
      return;
    }
    
    console.log('Current Wallet Balance:', wallet.balance);
    
    // Calculate missing bonuses
    const totalReferrals = user.referredUsers?.length || 0;
    const lastBonusAt = user.referralStats?.lastBonusAt || 0;
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
        user: userId,
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
      user.referralStats.lastBonusAt = totalReferrals;
      user.referralStats.totalBonusesEarned = (user.referralStats.totalBonusesEarned || 0) + bonusAmount;
      await user.save();
      
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

fixUserBonus();




