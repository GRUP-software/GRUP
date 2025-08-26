import mongoose from 'mongoose';
import User from './models/User.js';

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grup');
    
    // Get all users with their referral info
    const users = await User.find({}).select('email referredUsers referralStats');
    
    console.log('=== ALL USERS IN DATABASE ===');
    users.forEach((user, index) => {
      const referralCount = user.referredUsers?.length || 0;
      const lastBonusAt = user.referralStats?.lastBonusAt || 0;
      const totalBonusesEarned = user.referralStats?.totalBonusesEarned || 0;
      
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   - Referrals: ${referralCount}`);
      console.log(`   - Last Bonus At: ${lastBonusAt}`);
      console.log(`   - Total Bonuses Earned: ₦${totalBonusesEarned}`);
      console.log(`   - User ID: ${user._id}`);
      console.log('');
    });
    
    // Find users with high referral counts
    const highReferralUsers = users.filter(user => (user.referredUsers?.length || 0) >= 5);
    
    if (highReferralUsers.length > 0) {
      console.log('=== USERS WITH 5+ REFERRALS ===');
      highReferralUsers.forEach((user, index) => {
        const referralCount = user.referredUsers?.length || 0;
        console.log(`${index + 1}. ${user.email} - ${referralCount} referrals (ID: ${user._id})`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

listUsers();







