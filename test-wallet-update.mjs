import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';

dotenv.config();

async function testWalletUpdate() {
  try {
    console.log('🧪 Testing wallet balance updates...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Find a user with referrals
    const users = await User.find({}).populate('referredUsers');
    const usersWithReferrals = users.filter(user => user.referredUsers && user.referredUsers.length > 0);
    
    if (usersWithReferrals.length === 0) {
      console.log('❌ No users with referrals found');
      return;
    }
    
    const testUser = usersWithReferrals[0];
    console.log(`👤 Testing with user: ${testUser.email} (${testUser._id})`);
    console.log(`📊 Total referrals: ${testUser.referredUsers.length}`);
    
    // Get wallet
    let wallet = await Wallet.findOne({ user: testUser._id });
    if (!wallet) {
      console.log('❌ No wallet found for user');
      return;
    }
    
    console.log(`💳 Initial wallet balance: ₦${wallet.balance}`);
    
    // Get all referral bonus transactions
    const referralTransactions = await Transaction.find({
      wallet: wallet._id,
      reason: "REFERRAL_BONUS",
      type: "credit"
    }).sort({ createdAt: 1 });
    
    console.log(`🎁 Found ${referralTransactions.length} referral bonus transactions:`);
    let totalBonusGiven = 0;
    referralTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. Amount: ₦${tx.amount}, Date: ${tx.createdAt}`);
      totalBonusGiven += tx.amount;
    });
    
    console.log(`💰 Total bonus given: ₦${totalBonusGiven}`);
    
    // Calculate what should be given
    const totalReferrals = testUser.referredUsers.length;
    const shouldBeGiven = Math.floor(totalReferrals / 3) * 500;
    console.log(`📈 Should be given: ₦${shouldBeGiven} (${Math.floor(totalReferrals / 3)} complete sets of 3)`);
    
    // Test manual wallet update
    console.log('\n🔧 Testing manual wallet update...');
    const testAmount = 500;
    wallet.balance += testAmount;
    await wallet.save();
    
    console.log(`✅ Wallet balance updated to: ₦${wallet.balance}`);
    
    // Verify the update
    const updatedWallet = await Wallet.findOne({ user: testUser._id });
    console.log(`🔍 Verified wallet balance: ₦${updatedWallet.balance}`);
    
    // Test transaction creation
    console.log('\n📝 Testing transaction creation...');
    const testTransaction = await Transaction.create({
      wallet: wallet._id,
      user: testUser._id,
      type: "credit",
      amount: testAmount,
      reason: "TEST_TRANSACTION",
      description: "Test transaction for wallet update verification",
      metadata: {
        isTest: true
      }
    });
    
    console.log(`✅ Created test transaction: ${testTransaction._id}`);
    
    // Get final wallet state
    const finalWallet = await Wallet.findOne({ user: testUser._id });
    const finalTransactions = await Transaction.find({
      wallet: wallet._id,
      reason: "TEST_TRANSACTION"
    });
    
    console.log(`\n📊 Final Results:`);
    console.log(`💳 Final wallet balance: ₦${finalWallet.balance}`);
    console.log(`📝 Test transactions found: ${finalTransactions.length}`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.disconnect();
  }
}

testWalletUpdate();
