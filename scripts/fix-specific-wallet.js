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

// Fix the specific wallet with incorrect balance
const fixSpecificWallet = async () => {
  try {
    console.log('🔍 Fixing specific wallet with incorrect balance...');
    
    // The problematic wallet ID from the export
    const walletId = '688043fd17a62ffecaf586aa';
    const userId = '688043e917a62ffecaf586a0';
    
    // Find the wallet
    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      console.log('❌ Wallet not found');
      return;
    }
    
    console.log(`📊 Found wallet for user: ${userId}`);
    console.log(`   Current balance: ₦${wallet.balance}`);
    
    // Get all transactions for this wallet
    const transactions = await Transaction.find({ wallet: walletId });
    console.log(`   Transactions found: ${transactions.length}`);
    
    // Calculate correct balance from transactions
    let correctBalance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'credit') {
        correctBalance += transaction.amount;
      } else if (transaction.type === 'debit') {
        correctBalance -= transaction.amount;
      }
    });
    
    console.log(`   Expected balance from transactions: ₦${correctBalance}`);
    
    // Show transaction details
    console.log('\n📋 Transaction Details:');
    transactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type.toUpperCase()}: ₦${tx.amount} (${tx.reason})`);
      if (tx.description) {
        console.log(`      Description: ${tx.description}`);
      }
    });
    
    // Fix the balance
    if (wallet.balance !== correctBalance) {
      console.log(`\n🔧 Fixing wallet balance...`);
      console.log(`   Old balance: ₦${wallet.balance}`);
      console.log(`   New balance: ₦${correctBalance}`);
      
      wallet.balance = correctBalance;
      await wallet.save();
      
      console.log(`   ✅ Wallet balance fixed!`);
    } else {
      console.log(`\n✅ Wallet balance is already correct`);
    }
    
  } catch (error) {
    console.error('❌ Error in fixSpecificWallet:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixSpecificWallet();
  
  console.log('\n✅ Specific wallet fix completed!');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
