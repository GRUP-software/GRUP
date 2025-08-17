import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import PaymentHistory from '../models/PaymentHistory.js';
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

// Fix 1: Fix transactions with missing user field
const fixTransactionsWithMissingUser = async () => {
  console.log('\n🔧 FIXING TRANSACTIONS WITH MISSING USER FIELD...');
  
  // Find transactions without user field
  const transactionsWithoutUser = await Transaction.find({
    $or: [
      { user: { $exists: false } },
      { user: null }
    ]
  }).populate('wallet', 'user');
  
  console.log(`Found ${transactionsWithoutUser.length} transactions with missing user field`);
  
  let fixedCount = 0;
  
  for (const tx of transactionsWithoutUser) {
    try {
      // Get user from wallet
      if (tx.wallet && tx.wallet.user) {
        tx.user = tx.wallet.user;
        await tx.save();
        console.log(`✅ Fixed transaction ${tx._id} - added user: ${tx.wallet.user}`);
        fixedCount++;
      } else {
        console.log(`⚠️ Could not find user for transaction ${tx._id} - wallet has no user`);
      }
    } catch (error) {
      console.error(`❌ Error fixing transaction ${tx._id}:`, error.message);
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} transactions with missing user field`);
  return fixedCount;
};

// Fix 2: Fix transactions with missing paymentHistoryId metadata
const fixMissingPaymentHistoryRefs = async () => {
  console.log('\n🔧 FIXING MISSING PAYMENT HISTORY REFERENCES...');
  
  const transactionsWithoutRefs = await Transaction.find({
    reason: 'ORDER',
    $or: [
      { 'metadata.paymentHistoryId': { $exists: false } },
      { 'metadata.paymentHistoryId': null }
    ]
  }).populate('wallet', 'user');
  
  console.log(`Found ${transactionsWithoutRefs.length} transactions without payment history refs`);
  
  let fixedCount = 0;
  
  for (const tx of transactionsWithoutRefs) {
    try {
      // Try to find payment history by description or amount
      const paymentHistory = await PaymentHistory.findOne({
        $or: [
          { referenceId: { $regex: tx.description, $options: 'i' } },
          { amount: tx.amount },
          { walletUsed: tx.amount }
        ]
      });
      
      if (paymentHistory) {
        tx.metadata = tx.metadata || {};
        tx.metadata.paymentHistoryId = paymentHistory._id;
        await tx.save();
        
        console.log(`✅ Added payment history ref to transaction ${tx._id}`);
        fixedCount++;
      } else {
        console.log(`⚠️ Could not find payment history for transaction ${tx._id}`);
      }
    } catch (error) {
      console.error(`❌ Error fixing transaction ${tx._id}:`, error.message);
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} missing payment history references`);
  return fixedCount;
};

// Fix 3: Validate and fix any remaining wallet balance issues
const validateWalletBalances = async () => {
  console.log('\n🔧 VALIDATING WALLET BALANCES...');
  
  const wallets = await Wallet.find().populate('user', 'name email');
  let issuesFound = 0;
  
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
      console.log(`❌ Wallet balance mismatch for ${wallet.user?.name}:`);
      console.log(`   Current: ₦${wallet.balance}, Expected: ₦${expectedBalance}`);
      console.log(`   Difference: ₦${wallet.balance - expectedBalance}`);
      issuesFound++;
    }
  }
  
  console.log(`📊 Found ${issuesFound} wallet balance issues`);
  return issuesFound;
};

// Fix 4: Check for any orphaned payments
const checkOrphanedPayments = async () => {
  console.log('\n🔧 CHECKING FOR ORPHANED PAYMENTS...');
  
  const orphanedPayments = await PaymentHistory.find({
    status: 'paid',
    orderId: { $exists: false }
  }).populate('userId', 'name email');
  
  console.log(`Found ${orphanedPayments.length} orphaned payments`);
  
  if (orphanedPayments.length > 0) {
    console.log('⚠️ Orphaned payments found - these need manual review');
    orphanedPayments.forEach(payment => {
      console.log(`   Payment: ${payment.referenceId} - User: ${payment.userId?.name}`);
    });
  }
  
  return orphanedPayments.length;
};

// Fix 5: Clean up any invalid transactions
const cleanupInvalidTransactions = async () => {
  console.log('\n🔧 CLEANING UP INVALID TRANSACTIONS...');
  
  // Find transactions with invalid wallet references
  const invalidTransactions = await Transaction.aggregate([
    {
      $lookup: {
        from: 'wallets',
        localField: 'wallet',
        foreignField: '_id',
        as: 'walletData'
      }
    },
    {
      $match: {
        walletData: { $size: 0 }
      }
    }
  ]);
  
  console.log(`Found ${invalidTransactions.length} transactions with invalid wallet references`);
  
  if (invalidTransactions.length > 0) {
    console.log('⚠️ Invalid transactions found - these need manual review');
    invalidTransactions.forEach(tx => {
      console.log(`   Transaction: ${tx._id} - Invalid wallet: ${tx.wallet}`);
    });
  }
  
  return invalidTransactions.length;
};

// Main fix function
const runRemainingFixes = async () => {
  try {
    console.log('🚀 STARTING REMAINING ISSUE FIXES...');
    
    await connectDB();
    
    const userFixes = await fixTransactionsWithMissingUser();
    const refFixes = await fixMissingPaymentHistoryRefs();
    const balanceIssues = await validateWalletBalances();
    const orphanedCount = await checkOrphanedPayments();
    const invalidCount = await cleanupInvalidTransactions();
    
    console.log('\n📊 REMAINING FIXES SUMMARY:');
    console.log(`   User Field Fixes: ${userFixes}`);
    console.log(`   Payment History Ref Fixes: ${refFixes}`);
    console.log(`   Wallet Balance Issues: ${balanceIssues}`);
    console.log(`   Orphaned Payments: ${orphanedCount}`);
    console.log(`   Invalid Transactions: ${invalidCount}`);
    
    const totalFixes = userFixes + refFixes;
    const totalIssues = balanceIssues + orphanedCount + invalidCount;
    
    if (totalFixes > 0) {
      console.log(`\n✅ Successfully applied ${totalFixes} fixes!`);
    } else {
      console.log('\n✅ No fixes needed');
    }
    
    if (totalIssues > 0) {
      console.log(`\n⚠️ ${totalIssues} issues found that need manual review`);
    } else {
      console.log('\n✅ No remaining issues found!');
    }
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runRemainingFixes();
