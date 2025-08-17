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

// Fix 1: Wallet Balance Mismatches
const fixWalletBalances = async () => {
  console.log('\n🔧 FIXING WALLET BALANCE MISMATCHES...');
  
  const wallets = await Wallet.find().populate('user', 'name email');
  let fixedCount = 0;
  
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
      console.log(`   Old balance: ₦${wallet.balance}`);
      console.log(`   New balance: ₦${expectedBalance}`);
      
      wallet.balance = expectedBalance;
      await wallet.save();
      fixedCount++;
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} wallet balance mismatches`);
  return fixedCount;
};

// Fix 2: Create Orders for Orphaned Payments
const fixOrphanedPayments = async () => {
  console.log('\n🔧 FIXING ORPHANED PAID PAYMENTS...');
  
  const orphanedPayments = await PaymentHistory.find({
    status: 'paid',
    orderId: { $exists: false }
  }).populate('userId', 'name email');
  
  console.log(`Found ${orphanedPayments.length} orphaned payments`);
  
  let fixedCount = 0;
  
  for (const payment of orphanedPayments) {
    try {
      console.log(`🔧 Creating order for payment: ${payment.referenceId}`);
      
      // Generate tracking number
      const trackingNumber = `GRP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create order items
      const orderItems = payment.cartItems.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price,
        groupbuyId: null,
        groupStatus: 'forming'
      }));
      
      // Create order
      const order = new Order({
        trackingNumber,
        paymentHistoryId: payment._id,
        user: payment.userId,
        items: orderItems,
        currentStatus: 'groups_forming',
        deliveryAddress: payment.metadata?.deliveryAddress || {},
        totalAmount: payment.amount,
        walletUsed: payment.walletUsed,
        paystackAmount: payment.paystackAmount,
        progress: [{
          status: 'groups_forming',
          message: 'Order created from orphaned payment fix.',
          timestamp: new Date()
        }]
      });
      
      await order.save();
      
      // Update payment history
      payment.orderId = order._id;
      await payment.save();
      
      console.log(`✅ Created order: ${trackingNumber}`);
      fixedCount++;
      
    } catch (error) {
      console.error(`❌ Failed to create order for payment ${payment.referenceId}:`, error.message);
    }
  }
  
  console.log(`✅ Fixed ${fixedCount} orphaned payments`);
  return fixedCount;
};

// Fix 3: Fix Negative Wallet Balances
const fixNegativeBalances = async () => {
  console.log('\n🔧 FIXING NEGATIVE WALLET BALANCES...');
  
  const negativeWallets = await Wallet.find({ balance: { $lt: 0 } }).populate('user', 'name email');
  
  console.log(`Found ${negativeWallets.length} wallets with negative balances`);
  
  let fixedCount = 0;
  
  for (const wallet of negativeWallets) {
    console.log(`🔧 Fixing negative balance for ${wallet.user?.name}:`);
    console.log(`   Old balance: ₦${wallet.balance}`);
    
    // Set balance to 0 and create a compensating transaction
    wallet.balance = 0;
    await wallet.save();
    
    // Create a credit transaction to balance the negative
    await Transaction.create({
      wallet: wallet._id,
      user: wallet.user,
      type: 'credit',
      amount: Math.abs(wallet.balance),
      reason: 'REFUND',
      description: 'Balance correction for negative wallet balance',
      metadata: {
        isBalanceCorrection: true
      }
    });
    
    console.log(`   New balance: ₦0`);
    fixedCount++;
  }
  
  console.log(`✅ Fixed ${fixedCount} negative wallet balances`);
  return fixedCount;
};

// Fix 4: Add Missing Payment History References
const fixMissingPaymentHistoryRefs = async () => {
  console.log('\n🔧 FIXING MISSING PAYMENT HISTORY REFERENCES...');
  
  const transactionsWithoutRefs = await Transaction.find({
    reason: 'ORDER',
    'metadata.paymentHistoryId': { $exists: false }
  }).populate('wallet', 'user').populate('user', 'name email');
  
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

// Fix 5: Validate Payment Amount Consistency
const validatePaymentAmounts = async () => {
  console.log('\n🔧 VALIDATING PAYMENT AMOUNT CONSISTENCY...');
  
  const payments = await PaymentHistory.find();
  let issuesFound = 0;
  
  for (const payment of payments) {
    const expectedTotal = payment.walletUsed + payment.paystackAmount;
    if (Math.abs(payment.amount - expectedTotal) > 0.01) {
      console.log(`❌ Payment amount mismatch:`);
      console.log(`   Payment ID: ${payment._id}`);
      console.log(`   Reference: ${payment.referenceId}`);
      console.log(`   Total Amount: ₦${payment.amount}`);
      console.log(`   Wallet Used: ₦${payment.walletUsed}`);
      console.log(`   Paystack Amount: ₦${payment.paystackAmount}`);
      console.log(`   Expected Total: ₦${expectedTotal}`);
      console.log(`   Difference: ₦${payment.amount - expectedTotal}`);
      issuesFound++;
    }
  }
  
  console.log(`📊 Found ${issuesFound} payment amount inconsistencies`);
  return issuesFound;
};

// Main fix function
const runFixes = async () => {
  try {
    console.log('🚀 STARTING PAYMENT SYSTEM FIXES...');
    
    await connectDB();
    
    const walletFixes = await fixWalletBalances();
    const orphanedFixes = await fixOrphanedPayments();
    const negativeFixes = await fixNegativeBalances();
    const refFixes = await fixMissingPaymentHistoryRefs();
    const validationIssues = await validatePaymentAmounts();
    
    console.log('\n📊 FIX SUMMARY:');
    console.log(`   Wallet Balance Fixes: ${walletFixes}`);
    console.log(`   Orphaned Payment Fixes: ${orphanedFixes}`);
    console.log(`   Negative Balance Fixes: ${negativeFixes}`);
    console.log(`   Missing Reference Fixes: ${refFixes}`);
    console.log(`   Validation Issues Found: ${validationIssues}`);
    
    const totalFixes = walletFixes + orphanedFixes + negativeFixes + refFixes;
    
    if (totalFixes > 0) {
      console.log(`\n✅ Successfully applied ${totalFixes} fixes!`);
    } else {
      console.log('\n✅ No fixes needed - system is already consistent');
    }
    
    if (validationIssues > 0) {
      console.log(`\n⚠️ ${validationIssues} payment amount inconsistencies found - manual review needed`);
    }
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runFixes();
