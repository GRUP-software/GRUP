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

// Test 2: Check Initial Wallet Balance
const testInitialWalletBalance = async () => {
  console.log('\n🧪 TEST 2: CHECK INITIAL WALLET BALANCE');
  console.log('=' .repeat(50));
  
  const walletResponse = await makeRequest('/wallet');
  
  if (walletResponse.success) {
    console.log('✅ Wallet data retrieved');
    console.log(`💰 Current balance: ₦${walletResponse.data.balance}`);
    console.log(`📊 Total earned: ₦${walletResponse.data.stats.totalEarned}`);
    console.log(`💸 Total spent: ₦${walletResponse.data.stats.totalSpent}`);
    return walletResponse.data.balance;
  } else {
    console.log('❌ Failed to get wallet data:', walletResponse.data.message);
    return 0;
  }
};

// Test 3: Test Payment Initialization with Invalid Cart (Scenario 1)
const testPaymentInitialization = async () => {
  console.log('\n🧪 TEST 3: PAYMENT INITIALIZATION LOGIC');
  console.log('=' .repeat(50));
  
  // Test with invalid cart ID
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    useWallet: true,
    cartId: 'invalid-cart-id',
    paymentMethod: 'wallet_only',
    walletUse: 1000
  };
  
  console.log('💳 Testing payment initialization with invalid cart...');
  const paymentResponse = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!paymentResponse.success) {
    console.log('✅ Correctly rejected invalid cart');
    console.log(`❌ Error: ${paymentResponse.data.message}`);
    return true; // This is expected to fail
  } else {
    console.log('❌ Payment succeeded when it should have failed');
    return false;
  }
};

// Test 4: Test Payment Method Validation
const testPaymentMethodValidation = async () => {
  console.log('\n🧪 TEST 4: PAYMENT METHOD VALIDATION');
  console.log('=' .repeat(50));
  
  const testCases = [
    {
      name: 'Invalid payment method',
      data: {
        deliveryAddress: { street: 'Test', city: 'Test', state: 'Test' },
        phone: '08012345678',
        cartId: 'test-cart',
        paymentMethod: 'invalid_method'
      },
      shouldFail: true
    },
    {
      name: 'Missing delivery address',
      data: {
        phone: '08012345678',
        cartId: 'test-cart',
        paymentMethod: 'paystack_only'
      },
      shouldFail: true
    },
    {
      name: 'Missing phone',
      data: {
        deliveryAddress: { street: 'Test', city: 'Test', state: 'Test' },
        cartId: 'test-cart',
        paymentMethod: 'paystack_only'
      },
      shouldFail: true
    }
  ];
  
  let passedTests = 0;
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    const response = await makeRequest('/payment/initialize', 'POST', testCase.data);
    
    if (testCase.shouldFail && !response.success) {
      console.log('✅ Correctly rejected invalid input');
      passedTests++;
    } else if (!testCase.shouldFail && response.success) {
      console.log('✅ Correctly accepted valid input');
      passedTests++;
    } else {
      console.log('❌ Test failed - unexpected result');
    }
  }
  
  console.log(`\n📊 Payment validation tests: ${passedTests}/${testCases.length} passed`);
  return passedTests === testCases.length;
};

// Test 5: Test Wallet Balance Validation
const testWalletBalanceValidation = async () => {
  console.log('\n🧪 TEST 5: WALLET BALANCE VALIDATION');
  console.log('=' .repeat(50));
  
  // Get current wallet balance
  const walletResponse = await makeRequest('/wallet');
  if (!walletResponse.success) {
    console.log('❌ Cannot test wallet validation without wallet data');
    return false;
  }
  
  const currentBalance = walletResponse.data.balance;
  console.log(`💰 Current wallet balance: ₦${currentBalance}`);
  
  // Test with amount higher than balance
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    useWallet: true,
    cartId: 'test-cart',
    paymentMethod: 'wallet_only',
    walletUse: currentBalance + 1000 // Try to use more than available
  };
  
  console.log(`💳 Testing wallet payment with ₦${paymentData.walletUse} (balance: ₦${currentBalance})`);
  const paymentResponse = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!paymentResponse.success) {
    console.log('✅ Correctly rejected insufficient wallet balance');
    console.log(`❌ Error: ${paymentResponse.data.message}`);
    return true;
  } else {
    console.log('❌ Payment succeeded when it should have failed');
    return false;
  }
};

// Test 6: Check Final Wallet Balance
const testFinalWalletBalance = async () => {
  console.log('\n🧪 TEST 6: CHECK FINAL WALLET BALANCE');
  console.log('=' .repeat(50));
  
  const walletResponse = await makeRequest('/wallet');
  
  if (walletResponse.success) {
    console.log('✅ Final wallet data retrieved');
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
    console.log('❌ Failed to get final wallet data:', walletResponse.data.message);
    return null;
  }
};

// Test 7: Test Payment History
const testPaymentHistory = async () => {
  console.log('\n🧪 TEST 7: PAYMENT HISTORY');
  console.log('=' .repeat(50));
  
  const historyResponse = await makeRequest('/payment/history');
  
  if (historyResponse.success) {
    console.log('✅ Payment history retrieved');
    console.log(`📊 Total payments: ${historyResponse.data.data.length}`);
    
    if (historyResponse.data.data.length > 0) {
      historyResponse.data.data.slice(0, 3).forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.referenceId} - ${payment.status} - ₦${payment.amount}`);
      });
    } else {
      console.log('   No payment history found (expected for new user)');
    }
    
    return historyResponse.data;
  } else {
    console.log('❌ Failed to get payment history:', historyResponse.data.message);
    return null;
  }
};

// Main test function
const runPaymentLogicTests = async () => {
  console.log('🚀 STARTING PAYMENT LOGIC TESTS');
  console.log('=' .repeat(60));
  
  const results = {
    userRegistration: false,
    initialWallet: 0,
    paymentInitialization: false,
    paymentValidation: false,
    walletValidation: false,
    finalWallet: null,
    paymentHistory: null
  };
  
  try {
    // Test 1: User Registration and Login
    results.userRegistration = await testUserRegistration();
    if (!results.userRegistration) {
      console.log('❌ Cannot continue without user authentication');
      return results;
    }
    
    // Test 2: Check Initial Wallet Balance
    results.initialWallet = await testInitialWalletBalance();
    
    // Test 3: Test Payment Initialization Logic
    results.paymentInitialization = await testPaymentInitialization();
    
    // Test 4: Test Payment Method Validation
    results.paymentValidation = await testPaymentMethodValidation();
    
    // Test 5: Test Wallet Balance Validation
    results.walletValidation = await testWalletBalanceValidation();
    
    // Test 6: Check Final Wallet Balance
    results.finalWallet = await testFinalWalletBalance();
    
    // Test 7: Test Payment History
    results.paymentHistory = await testPaymentHistory();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  // Summary
  console.log('\n📊 PAYMENT LOGIC TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`✅ User Registration: ${results.userRegistration ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Initial Wallet: ₦${results.initialWallet}`);
  console.log(`💳 Payment Initialization: ${results.paymentInitialization ? 'PASS' : 'FAIL'}`);
  console.log(`🔍 Payment Validation: ${results.paymentValidation ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Wallet Validation: ${results.walletValidation ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Final Wallet Check: ${results.finalWallet ? 'PASS' : 'FAIL'}`);
  console.log(`📊 Payment History: ${results.paymentHistory ? 'PASS' : 'FAIL'}`);
  
  const passedTests = Object.values(results).filter(r => r === true || (typeof r === 'object' && r !== null)).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL PAYMENT LOGIC TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed - review the results above');
  }
  
  return results;
};

// Run the tests
runPaymentLogicTests().then(results => {
  console.log('\n✅ Payment logic tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
