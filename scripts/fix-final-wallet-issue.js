import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';

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

// Fix the specific wallet balance issue
const fixFinalWalletIssue = async () => {
  console.log('\n🔧 FIXING FINAL WALLET BALANCE ISSUE...');
  
  // Find the wallet with balance mismatch
  const wallets = await Wallet.find().populate('user', 'name email');
  
  for (const wallet of wallets) {
    const transactions = await Transaction.find({ wallet: wallet._id });
    let expectedBalance = 0;
    
    transactions.forEach(tx => {
      if (tx.type === 'credit') {
        expectedBalance += tx.amount;
      } else if (tx.type === 'debit') {
        expectedBalance -= tx.amount;
      }
    });
    
    if (Math.abs(wallet.balance - expectedBalance) > 0.01) {
      console.log(`🔧 Fixing wallet for ${wallet.user?.name}:`);
      console.log(`   Current balance: ₦${wallet.balance}`);
      console.log(`   Expected balance: ₦${expectedBalance}`);
      console.log(`   Difference: ₦${wallet.balance - expectedBalance}`);
      
      // Show transaction details
      console.log('\n📋 Transaction Details:');
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type.toUpperCase()}: ₦${tx.amount} (${tx.reason})`);
        if (tx.description) {
          console.log(`      Description: ${tx.description}`);
        }
      });
      
      // Fix the balance
      wallet.balance = expectedBalance;
      await wallet.save();
      
      console.log(`\n✅ Wallet balance fixed to: ₦${expectedBalance}`);
      return true;
    }
  }
  
  console.log('✅ No wallet balance issues found');
  return false;
};

// Main function
const main = async () => {
  try {
    console.log('🚀 FIXING FINAL WALLET ISSUE...');
    
    await connectDB();
    const fixed = await fixFinalWalletIssue();
    
    if (fixed) {
      console.log('\n✅ Final wallet issue fixed successfully!');
    } else {
      console.log('\n✅ No wallet issues found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

main();
