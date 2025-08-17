import mongoose from 'mongoose';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import PaymentHistory from '../models/PaymentHistory.js';
import User from '../models/User.js';
import Order from '../models/order.js';

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

// Analyze wallet balance consistency
const analyzeWalletBalances = async () => {
  console.log('\n🔍 ANALYZING WALLET BALANCE CONSISTENCY...');
  
  const wallets = await Wallet.find().populate('user', 'name email');
  let issuesFound = 0;
  
  for (const wallet of wallets) {
    // Calculate expected balance from transactions
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
      console.log(`❌ WALLET BALANCE MISMATCH:`);
      console.log(`   User: ${wallet.user?.name} (${wallet.user?.email})`);
      console.log(`   Wallet ID: ${wallet._id}`);
      console.log(`   Current Balance: ₦${wallet.balance}`);
      console.log(`   Expected Balance: ₦${expectedBalance}`);
      console.log(`   Difference: ₦${wallet.balance - expectedBalance}`);
      console.log(`   Transactions: ${transactions.length}`);
      issuesFound++;
    }
  }
  
  console.log(`\n📊 Wallet Analysis Complete: ${issuesFound} issues found out of ${wallets.length} wallets`);
  return issuesFound;
};

// Analyze payment history consistency
const analyzePaymentHistory = async () => {
  console.log('\n🔍 ANALYZING PAYMENT HISTORY CONSISTENCY...');
  
  const payments = await PaymentHistory.find().populate('userId', 'name email');
  let issuesFound = 0;
  
  for (const payment of payments) {
    // Check if walletUsed + paystackAmount equals total amount
    const expectedTotal = payment.walletUsed + payment.paystackAmount;
    if (Math.abs(payment.amount - expectedTotal) > 0.01) {
      console.log(`❌ PAYMENT AMOUNT MISMATCH:`);
      console.log(`   Payment ID: ${payment._id}`);
      console.log(`   Reference: ${payment.referenceId}`);
      console.log(`   Total Amount: ₦${payment.amount}`);
      console.log(`   Wallet Used: ₦${payment.walletUsed}`);
      console.log(`   Paystack Amount: ₦${payment.paystackAmount}`);
      console.log(`   Expected Total: ₦${expectedTotal}`);
      console.log(`   Difference: ₦${payment.amount - expectedTotal}`);
      issuesFound++;
    }
    
    // Check for orphaned payments (no order created)
    if (payment.status === 'paid' && !payment.orderId) {
      console.log(`❌ ORPHANED PAID PAYMENT:`);
      console.log(`   Payment ID: ${payment._id}`);
      console.log(`   Reference: ${payment.referenceId}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   No order created`);
      issuesFound++;
    }
  }
  
  console.log(`\n📊 Payment History Analysis Complete: ${issuesFound} issues found out of ${payments.length} payments`);
  return issuesFound;
};

// Analyze transaction consistency
const analyzeTransactions = async () => {
  console.log('\n🔍 ANALYZING TRANSACTION CONSISTENCY...');
  
  const transactions = await Transaction.find().populate('wallet', 'user').populate('user', 'name email');
  let issuesFound = 0;
  
  // Check for transactions without proper metadata
  for (const tx of transactions) {
    if (tx.reason === 'ORDER' && !tx.metadata?.paymentHistoryId) {
      console.log(`❌ ORDER TRANSACTION WITHOUT PAYMENT HISTORY:`);
      console.log(`   Transaction ID: ${tx._id}`);
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ₦${tx.amount}`);
      console.log(`   User: ${tx.user?.name} (${tx.user?.email})`);
      console.log(`   Missing paymentHistoryId in metadata`);
      issuesFound++;
    }
    
    // Check for negative wallet balances
    if (tx.type === 'debit') {
      const wallet = await Wallet.findById(tx.wallet);
      if (wallet && wallet.balance < 0) {
        console.log(`❌ NEGATIVE WALLET BALANCE:`);
        console.log(`   Wallet ID: ${wallet._id}`);
        console.log(`   User: ${tx.user?.name} (${tx.user?.email})`);
        console.log(`   Current Balance: ₦${wallet.balance}`);
        console.log(`   Transaction: ${tx.type} ₦${tx.amount}`);
        issuesFound++;
      }
    }
  }
  
  console.log(`\n📊 Transaction Analysis Complete: ${issuesFound} issues found out of ${transactions.length} transactions`);
  return issuesFound;
};

// Test payment scenarios
const testPaymentScenarios = async () => {
  console.log('\n🧪 TESTING PAYMENT SCENARIOS...');
  
  // Scenario 1: Wallet-only payment
  console.log('\n📋 Scenario 1: Wallet-only payment');
  console.log('   - User has sufficient wallet balance');
  console.log('   - Payment should deduct from wallet immediately');
  console.log('   - Should create order and group buys');
  
  // Scenario 2: Paystack-only payment
  console.log('\n📋 Scenario 2: Paystack-only payment');
  console.log('   - User has no wallet or insufficient balance');
  console.log('   - Payment should go through Paystack');
  console.log('   - Order created after webhook confirmation');
  
  // Scenario 3: Partial wallet + Paystack payment
  console.log('\n📋 Scenario 3: Partial wallet + Paystack payment');
  console.log('   - User has some wallet balance but not enough');
  console.log('   - Wallet deducted after Paystack success');
  console.log('   - Order created after webhook confirmation');
  
  // Scenario 4: Insufficient wallet balance
  console.log('\n📋 Scenario 4: Insufficient wallet balance');
  console.log('   - User tries wallet-only payment with insufficient balance');
  console.log('   - Should return error, no wallet deduction');
  
  // Scenario 5: Failed Paystack payment
  console.log('\n📋 Scenario 5: Failed Paystack payment');
  console.log('   - Paystack payment fails');
  console.log('   - No wallet deduction, no order creation');
  
  console.log('\n✅ Payment scenarios documented');
};

// Check for potential race conditions
const checkRaceConditions = async () => {
  console.log('\n🔍 CHECKING FOR POTENTIAL RACE CONDITIONS...');
  
  // Check for duplicate payment histories
  const duplicateReferences = await PaymentHistory.aggregate([
    { $group: { _id: '$referenceId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  
  if (duplicateReferences.length > 0) {
    console.log(`❌ DUPLICATE PAYMENT REFERENCES FOUND: ${duplicateReferences.length}`);
    duplicateReferences.forEach(ref => {
      console.log(`   Reference: ${ref._id} (${ref.count} times)`);
    });
  } else {
    console.log('✅ No duplicate payment references found');
  }
  
  // Check for duplicate transactions
  const duplicateTransactions = await Transaction.aggregate([
    { $group: { _id: { wallet: '$wallet', amount: '$amount', type: '$type', reason: '$reason', createdAt: { $dateToString: { format: '%Y-%m-%d %H:%M:%S', date: '$createdAt' } } }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);
  
  if (duplicateTransactions.length > 0) {
    console.log(`❌ POTENTIAL DUPLICATE TRANSACTIONS: ${duplicateTransactions.length}`);
    duplicateTransactions.slice(0, 5).forEach(tx => {
      console.log(`   Wallet: ${tx._id.wallet}, Amount: ₦${tx._id.amount}, Type: ${tx._id.type}, Count: ${tx.count}`);
    });
  } else {
    console.log('✅ No duplicate transactions found');
  }
};

// Check for data integrity issues
const checkDataIntegrity = async () => {
  console.log('\n🔍 CHECKING DATA INTEGRITY...');
  
  // Check for users without wallets
  const usersWithoutWallets = await User.aggregate([
    { $lookup: { from: 'wallets', localField: '_id', foreignField: 'user', as: 'wallet' } },
    { $match: { wallet: { $size: 0 } } }
  ]);
  
  if (usersWithoutWallets.length > 0) {
    console.log(`❌ USERS WITHOUT WALLETS: ${usersWithoutWallets.length}`);
    usersWithoutWallets.slice(0, 5).forEach(user => {
      console.log(`   User: ${user.name} (${user.email})`);
    });
  } else {
    console.log('✅ All users have wallets');
  }
  
  // Check for orphaned transactions
  const orphanedTransactions = await Transaction.aggregate([
    { $lookup: { from: 'wallets', localField: 'wallet', foreignField: '_id', as: 'walletData' } },
    { $match: { walletData: { $size: 0 } } }
  ]);
  
  if (orphanedTransactions.length > 0) {
    console.log(`❌ ORPHANED TRANSACTIONS: ${orphanedTransactions.length}`);
    console.log('   Transactions referencing non-existent wallets');
  } else {
    console.log('✅ No orphaned transactions found');
  }
};

// Main analysis function
const runAnalysis = async () => {
  try {
    console.log('🚀 STARTING COMPREHENSIVE PAYMENT SYSTEM ANALYSIS...');
    
    await connectDB();
    
    const walletIssues = await analyzeWalletBalances();
    const paymentIssues = await analyzePaymentHistory();
    const transactionIssues = await analyzeTransactions();
    
    await testPaymentScenarios();
    await checkRaceConditions();
    await checkDataIntegrity();
    
    const totalIssues = walletIssues + paymentIssues + transactionIssues;
    
    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log(`   Wallet Issues: ${walletIssues}`);
    console.log(`   Payment Issues: ${paymentIssues}`);
    console.log(`   Transaction Issues: ${transactionIssues}`);
    console.log(`   Total Issues: ${totalIssues}`);
    
    if (totalIssues === 0) {
      console.log('\n✅ No critical issues found in payment system');
    } else {
      console.log('\n⚠️ Issues found that need attention');
    }
    
    console.log('\n✅ Analysis completed!');
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runAnalysis();
