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

// Investigate all wallets
const investigateWallets = async () => {
  try {
    console.log('🔍 Investigating all wallets...');
    
    // Get all wallets
    const wallets = await Wallet.find().populate('user', 'name email');
    console.log(`📊 Found ${wallets.length} wallets`);
    
    // Sort by balance to find the highest ones
    const sortedWallets = wallets.sort((a, b) => b.balance - a.balance);
    
    console.log('\n💰 Top 10 Wallets by Balance:');
    console.log('='.repeat(80));
    
    for (let i = 0; i < Math.min(10, sortedWallets.length); i++) {
      const wallet = sortedWallets[i];
      const user = wallet.user;
      
      // Get transactions for this wallet
      const transactions = await Transaction.find({ wallet: wallet._id });
      
      // Calculate expected balance from transactions
      let expectedBalance = 0;
      transactions.forEach(transaction => {
        if (transaction.type === 'credit') {
          expectedBalance += transaction.amount;
        } else if (transaction.type === 'debit') {
          expectedBalance -= transaction.amount;
        }
      });
      
      console.log(`${i + 1}. User: ${user?.name || 'Unknown'} (${user?.email || 'No email'})`);
      console.log(`   Wallet ID: ${wallet._id}`);
      console.log(`   Current Balance: ₦${wallet.balance}`);
      console.log(`   Expected Balance: ₦${expectedBalance}`);
      console.log(`   Transactions: ${transactions.length}`);
      
      if (transactions.length > 0) {
        console.log(`   Recent Transactions:`);
        transactions.slice(0, 3).forEach(tx => {
          console.log(`     - ${tx.type.toUpperCase()}: ₦${tx.amount} (${tx.reason}) - ${tx.description}`);
        });
      }
      
      if (wallet.balance !== expectedBalance) {
        console.log(`   ⚠️  BALANCE MISMATCH!`);
      }
      
      console.log('');
    }
    
    // Look specifically for wallets with balance around 42000
    console.log('🔍 Looking for wallets with balance around ₦42,000:');
    console.log('='.repeat(80));
    
    const suspiciousWallets = wallets.filter(w => w.balance >= 40000 && w.balance <= 45000);
    
    if (suspiciousWallets.length === 0) {
      console.log('❌ No wallets found with balance around ₦42,000');
    } else {
      suspiciousWallets.forEach(wallet => {
        const user = wallet.user;
        console.log(`Found wallet with ₦${wallet.balance} balance:`);
        console.log(`   User: ${user?.name || 'Unknown'} (${user?.email || 'No email'})`);
        console.log(`   Wallet ID: ${wallet._id}`);
        console.log(`   User ID: ${wallet.user}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error in investigateWallets:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await investigateWallets();
  
  console.log('\n✅ Wallet investigation completed!');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
