import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grup-group-buy');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixLastWallet = async () => {
  console.log('🔧 Fixing last wallet balance issue...');
  
  // Find the specific wallet
  const wallet = await Wallet.findById('689a7d2591b5061ae1c76755').populate('user', 'name email');
  if (!wallet) {
    console.log('❌ Wallet not found');
    return;
  }
  
  console.log(`Found wallet for: ${wallet.user?.name} (${wallet.user?.email})`);
  console.log(`Current balance: ₦${wallet.balance}`);
  
  // Get transactions
  const transactions = await Transaction.find({ wallet: wallet._id });
  console.log(`Transactions found: ${transactions.length}`);
  
  // Calculate expected balance
  let expectedBalance = 0;
  transactions.forEach(tx => {
    if (tx.type === 'credit') {
      expectedBalance += tx.amount;
    } else if (tx.type === 'debit') {
      expectedBalance -= tx.amount;
    }
  });
  
  console.log(`Expected balance: ₦${expectedBalance}`);
  console.log(`Difference: ₦${wallet.balance - expectedBalance}`);
  
  // Fix the balance
  wallet.balance = expectedBalance;
  await wallet.save();
  
  console.log(`✅ Wallet balance fixed to: ₦${expectedBalance}`);
};

const main = async () => {
  try {
    await connectDB();
    await fixLastWallet();
    console.log('✅ Last wallet issue fixed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

main();
