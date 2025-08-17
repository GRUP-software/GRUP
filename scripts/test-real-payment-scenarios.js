import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';
let authToken = null;

// Helper function to make authenticated requests
const makeRequest = async (endpoint, method = 'GET', body = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const options = {
    method,
    headers,
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      data,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { error: error.message },
      success: false
    };
  }
};

// Test 1: User Registration and Login
const testUserRegistration = async () => {
  console.log('\n🧪 TEST 1: USER REGISTRATION AND LOGIN');
  console.log('=' .repeat(50));
  
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'password123';
  
  // Register new user
  console.log('📝 Registering new user...');
  const registerResponse = await makeRequest('/auth/signup', 'POST', {
    name: 'Test User',
    email: testEmail,
    password: testPassword
  });
  
  if (registerResponse.success) {
    console.log('✅ User registration successful');
  } else {
    console.log('❌ User registration failed:', registerResponse.data.message);
    return false;
  }
  
  // Login user
  console.log('🔐 Logging in user...');
  const loginResponse = await makeRequest('/auth/login', 'POST', {
    email: testEmail,
    password: testPassword
  });
  
  if (loginResponse.success) {
    console.log('✅ User login successful');
    authToken = loginResponse.data.token;
    return true;
  } else {
    console.log('❌ User login failed:', loginResponse.data.message);
    return false;
  }
};

// Test 2: Create a Test Cart
const createTestCart = async () => {
  console.log('\n🧪 TEST 2: CREATE TEST CART');
  console.log('=' .repeat(50));
  
  // First, let's try to get the user's cart
  console.log('🛒 Getting user cart...');
  const cartResponse = await makeRequest('/cart');
  
  if (cartResponse.success) {
    console.log('✅ Cart retrieved successfully');
    console.log(`📦 Cart ID: ${cartResponse.data._id}`);
    console.log(`📋 Items in cart: ${cartResponse.data.items.length}`);
    
    // If cart has no ID, it might be a new cart
    if (!cartResponse.data._id) {
      console.log('⚠️ Cart has no ID, creating a test cart...');
      // Create a test cart by adding an item
      const addItemResponse = await makeRequest('/cart/add', 'POST', {
        productId: '507f1f77bcf86cd799439011', // Test product ID
        quantity: 1
      });
      
      if (addItemResponse.success) {
        console.log('✅ Test cart created with item');
        return addItemResponse.data._id;
      } else {
        console.log('❌ Failed to create test cart:', addItemResponse.data.message);
        return null;
      }
    }
    
    return cartResponse.data._id;
  } else {
    console.log('❌ Failed to get cart:', cartResponse.data.message);
    return null;
  }
};

// Test 3: Test Paystack-Only Payment (Scenario 2)
const testPaystackOnlyPayment = async (cartId) => {
  console.log('\n🧪 TEST 3: PAYSTACK-ONLY PAYMENT');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '456 Paystack Street',
      city: 'Paystack City',
      state: 'Paystack State'
    },
    phone: '08087654321',
    useWallet: false,
    cartId: cartId,
    paymentMethod: 'paystack_only'
  };
  
  console.log('💳 Initializing Paystack-only payment...');
  const paymentResponse = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (paymentResponse.success) {
    console.log('✅ Paystack payment initialized');
    console.log(`💰 Amount: ₦${paymentResponse.data.amount}`);
    console.log(`🔗 Authorization URL: ${paymentResponse.data.authorization_url}`);
    console.log(`📋 Reference: ${paymentResponse.data.reference}`);
    console.log(`📝 Payment History ID: ${paymentResponse.data.paymentHistoryId}`);
    return paymentResponse.data;
  } else {
    console.log('❌ Paystack payment failed:', paymentResponse.data.message);
    return null;
  }
};

// Test 4: Test Partial Wallet + Paystack Payment (Scenario 3)
const testPartialWalletPayment = async (cartId) => {
  console.log('\n🧪 TEST 4: PARTIAL WALLET + PAYSTACK PAYMENT');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '789 Partial Street',
      city: 'Partial City',
      state: 'Partial State'
    },
    phone: '08011111111',
    useWallet: true,
    cartId: cartId,
    paymentMethod: 'wallet_and_paystack',
    walletUse: 500 // Use ₦500 from wallet, rest via Paystack
  };
  
  console.log('💳 Initializing partial wallet + Paystack payment...');
  const paymentResponse = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (paymentResponse.success) {
    console.log('✅ Partial payment initialized');
    console.log(`💰 Wallet used: ₦${paymentResponse.data.walletUse}`);
    console.log(`💳 Paystack amount: ₦${paymentResponse.data.paystackAmount}`);
    console.log(`🔗 Authorization URL: ${paymentResponse.data.authorization_url}`);
    console.log(`📋 Reference: ${paymentResponse.data.reference}`);
    return paymentResponse.data;
  } else {
    console.log('❌ Partial payment failed:', paymentResponse.data.message);
    return null;
  }
};

// Test 5: Test Insufficient Wallet Balance (Scenario 4)
const testInsufficientWalletBalance = async (cartId) => {
  console.log('\n🧪 TEST 5: INSUFFICIENT WALLET BALANCE');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '999 Insufficient Street',
      city: 'Insufficient City',
      state: 'Insufficient State'
    },
    phone: '08099999999',
    useWallet: true,
    cartId: cartId,
    paymentMethod: 'wallet_only',
    walletUse: 10000 // Try to use ₦10,000 (more than available)
  };
  
  console.log('💳 Attempting payment with insufficient wallet balance...');
  const paymentResponse = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!paymentResponse.success) {
    console.log('✅ Correctly rejected insufficient wallet balance');
    console.log(`❌ Error: ${paymentResponse.data.message}`);
    return true; // This is expected to fail
  } else {
    console.log('❌ Payment succeeded when it should have failed');
    return false;
  }
};

// Test 6: Check Wallet Balance After Tests
const checkWalletBalance = async () => {
  console.log('\n🧪 TEST 6: CHECK WALLET BALANCE');
  console.log('=' .repeat(50));
  
  const walletResponse = await makeRequest('/wallet');
  
  if (walletResponse.success) {
    console.log('✅ Wallet data retrieved');
    console.log(`💰 Current balance: ₦${walletResponse.data.balance}`);
    console.log(`📊 Total earned: ₦${walletResponse.data.stats.totalEarned}`);
    console.log(`💸 Total spent: ₦${walletResponse.data.stats.totalSpent}`);
    
    // Show recent transactions
    console.log('\n📋 Recent transactions:');
    walletResponse.data.transactions.slice(0, 5).forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type.toUpperCase()}: ₦${tx.amount} (${tx.reason})`);
    });
    
    return walletResponse.data;
  } else {
    console.log('❌ Failed to get wallet data:', walletResponse.data.message);
    return null;
  }
};

// Test 7: Check Payment History
const checkPaymentHistory = async () => {
  console.log('\n🧪 TEST 7: CHECK PAYMENT HISTORY');
  console.log('=' .repeat(50));
  
  const historyResponse = await makeRequest('/payment/history');
  
  if (historyResponse.success) {
    console.log('✅ Payment history retrieved');
    console.log(`📊 Total payments: ${historyResponse.data.data.length}`);
    
    if (historyResponse.data.data.length > 0) {
      historyResponse.data.data.forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.referenceId} - ${payment.status} - ₦${payment.amount}`);
        console.log(`      Wallet Used: ₦${payment.walletUsed} | Paystack: ₦${payment.paystackAmount}`);
      });
    } else {
      console.log('   No payment history found');
    }
    
    return historyResponse.data;
  } else {
    console.log('❌ Failed to get payment history:', historyResponse.data.message);
    return null;
  }
};

// Main test function
const runRealPaymentTests = async () => {
  console.log('🚀 STARTING REAL PAYMENT SCENARIO TESTS');
  console.log('=' .repeat(60));
  
  const results = {
    userRegistration: false,
    cartCreated: null,
    paystackOnlyPayment: null,
    partialPayment: null,
    insufficientBalance: false,
    walletBalance: null,
    paymentHistory: null
  };
  
  try {
    // Test 1: User Registration and Login
    results.userRegistration = await testUserRegistration();
    if (!results.userRegistration) {
      console.log('❌ Cannot continue without user authentication');
      return results;
    }
    
    // Test 2: Create Test Cart
    results.cartCreated = await createTestCart();
    if (!results.cartCreated) {
      console.log('❌ Cannot continue without cart');
      return results;
    }
    
    // Test 3: Paystack-Only Payment
    results.paystackOnlyPayment = await testPaystackOnlyPayment(results.cartCreated);
    
    // Test 4: Partial Wallet + Paystack Payment
    results.partialPayment = await testPartialWalletPayment(results.cartCreated);
    
    // Test 5: Insufficient Wallet Balance
    results.insufficientBalance = await testInsufficientWalletBalance(results.cartCreated);
    
    // Test 6: Check Wallet Balance
    results.walletBalance = await checkWalletBalance();
    
    // Test 7: Check Payment History
    results.paymentHistory = await checkPaymentHistory();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  // Summary
  console.log('\n📊 REAL PAYMENT TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`✅ User Registration: ${results.userRegistration ? 'PASS' : 'FAIL'}`);
  console.log(`🛒 Cart Created: ${results.cartCreated ? 'YES' : 'NO'}`);
  console.log(`💳 Paystack-Only Payment: ${results.paystackOnlyPayment ? 'PASS' : 'FAIL'}`);
  console.log(`💳 Partial Payment: ${results.partialPayment ? 'PASS' : 'FAIL'}`);
  console.log(`❌ Insufficient Balance Test: ${results.insufficientBalance ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Wallet Balance Check: ${results.walletBalance ? 'PASS' : 'FAIL'}`);
  console.log(`📊 Payment History: ${results.paymentHistory ? 'PASS' : 'FAIL'}`);
  
  const passedTests = Object.values(results).filter(r => r === true || (typeof r === 'object' && r !== null)).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL REAL PAYMENT TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed - review the results above');
  }
  
  return results;
};

// Run the tests
runRealPaymentTests().then(results => {
  console.log('\n✅ Real payment scenario tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
