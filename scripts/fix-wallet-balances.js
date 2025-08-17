import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grup-group-buy');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix wallet balances by recalculating from transactions
const fixWalletBalances = async () => {
  try {
    console.log('🔍 Starting wallet balance fix...');
    
    // Get all wallets
    const wallets = await Wallet.find();
    console.log(`📊 Found ${wallets.length} wallets to check`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const wallet of wallets) {
      try {
        // Get all transactions for this wallet
        const transactions = await Transaction.find({ wallet: wallet._id });
        
        // Calculate correct balance from transactions
        let correctBalance = 0;
        transactions.forEach(transaction => {
          if (transaction.type === 'credit') {
            correctBalance += transaction.amount;
          } else if (transaction.type === 'debit') {
            correctBalance -= transaction.amount;
          }
        });
        
        // Check if balance needs fixing
        if (wallet.balance !== correctBalance) {
          console.log(`🔧 Fixing wallet ${wallet._id} for user ${wallet.user}:`);
          console.log(`   Old balance: ₦${wallet.balance}`);
          console.log(`   Correct balance: ₦${correctBalance}`);
          console.log(`   Transactions: ${transactions.length}`);
          
          // Update wallet balance
          wallet.balance = correctBalance;
          await wallet.save();
          
          console.log(`   ✅ Fixed!`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ Error fixing wallet ${wallet._id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📈 Fix Summary:');
    console.log(`   Total wallets checked: ${wallets.length}`);
    console.log(`   Wallets fixed: ${fixedCount}`);
    console.log(`   Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error in fixWalletBalances:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixWalletBalances();
  
  console.log('\n✅ Wallet balance fix completed!');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
