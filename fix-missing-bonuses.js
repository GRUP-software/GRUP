const mongoose = require('mongoose');
const User = require('./models/User.js');
const Wallet = require('./models/Wallet.js');
const Transaction = require('./models/Transaction.js');

async function fixMissingBonuses() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grup');
    
    const userId = '68a1215dde312fee0c95c863';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User:', user.email);
    console.log('Total Referrals:', user.referredUsers?.length || 0);
    console.log('Last Bonus At:', user.referralStats?.lastBonusAt || 0);
    
    const wallet = await Wallet.findOne({ user: user._id });
    console.log('Current Wallet Balance:', wallet.balance);
    
    // Check how many bonuses should have been given
    const totalReferrals = user.referredUsers?.length || 0;
    const lastBonusAt = user.referralStats?.lastBonusAt || 0;
    const newReferrals = totalReferrals - lastBonusAt;
    const completeSets = Math.floor(newReferrals / 3);
    
    console.log(`\nAnalysis:`);
    console.log(`- Total referrals: ${totalReferrals}`);
    console.log(`- Last bonus at: ${lastBonusAt}`);
    console.log(`- New referrals since last bonus: ${newReferrals}`);
    console.log(`- Complete sets of 3: ${completeSets}`);
    console.log(`- Bonuses that should be given: ${completeSets}`);
    
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

fixMissingBonuses();




