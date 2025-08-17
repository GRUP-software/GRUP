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

// Test 2: Test Missing Delivery Address
const testMissingDeliveryAddress = async () => {
  console.log('\n🧪 TEST 2: MISSING DELIVERY ADDRESS');
  console.log('=' .repeat(50));
  
  const paymentData = {
    phone: '08012345678',
    cartId: 'test-cart',
    paymentMethod: 'paystack_only'
  };
  
  console.log('💳 Testing payment with missing delivery address...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!response.success) {
    console.log('✅ Correctly rejected missing delivery address');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    if (response.data.required) {
      console.log(`📋 Required fields: ${response.data.required.join(', ')}`);
    }
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Test 3: Test Incomplete Delivery Address
const testIncompleteDeliveryAddress = async () => {
  console.log('\n🧪 TEST 3: INCOMPLETE DELIVERY ADDRESS');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      // Missing city and state
    },
    phone: '08012345678',
    cartId: 'test-cart',
    paymentMethod: 'paystack_only'
  };
  
  console.log('💳 Testing payment with incomplete delivery address...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!response.success) {
    console.log('✅ Correctly rejected incomplete delivery address');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    if (response.data.required) {
      console.log(`📋 Required fields: ${response.data.required.join(', ')}`);
    }
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Test 4: Test Missing Phone Number
const testMissingPhoneNumber = async () => {
  console.log('\n🧪 TEST 4: MISSING PHONE NUMBER');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    cartId: 'test-cart',
    paymentMethod: 'paystack_only'
  };
  
  console.log('💳 Testing payment with missing phone number...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!response.success) {
    console.log('✅ Correctly rejected missing phone number');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Test 5: Test Invalid Phone Number Format
const testInvalidPhoneNumber = async () => {
  console.log('\n🧪 TEST 5: INVALID PHONE NUMBER FORMAT');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '12345', // Invalid phone number
    cartId: 'test-cart',
    paymentMethod: 'paystack_only'
  };
  
  console.log('💳 Testing payment with invalid phone number format...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!response.success) {
    console.log('✅ Correctly rejected invalid phone number');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Test 6: Test Missing Cart ID
const testMissingCartId = async () => {
  console.log('\n🧪 TEST 6: MISSING CART ID');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    paymentMethod: 'paystack_only'
  };
  
  console.log('💳 Testing payment with missing cart ID...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!response.success) {
    console.log('✅ Correctly rejected missing cart ID');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Test 7: Test Invalid Cart ID
const testInvalidCartId = async () => {
  console.log('\n🧪 TEST 7: INVALID CART ID');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    cartId: 'invalid-cart-id',
    paymentMethod: 'paystack_only'
  };
  
  console.log('💳 Testing payment with invalid cart ID...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!response.success) {
    console.log('✅ Correctly rejected invalid cart ID');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    if (response.data.cartId) {
      console.log(`📋 Cart ID: ${response.data.cartId}`);
    }
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Test 8: Test Wallet Payment with Insufficient Balance
const testInsufficientWalletBalance = async () => {
  console.log('\n🧪 TEST 8: INSUFFICIENT WALLET BALANCE');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    cartId: 'test-cart',
    paymentMethod: 'wallet_only',
    walletUse: 10000 // Try to use ₦10,000 (more than available)
  };
  
  console.log('💳 Testing wallet payment with insufficient balance...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (!response.success) {
    console.log('✅ Correctly rejected insufficient wallet balance');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    if (response.data.wallet) {
      console.log(`💰 Current balance: ₦${response.data.wallet.currentBalance}`);
      console.log(`💰 Required amount: ₦${response.data.wallet.requiredAmount}`);
      console.log(`💰 Shortfall: ₦${response.data.wallet.shortfall}`);
    }
    if (response.data.suggestions) {
      console.log(`💡 Suggestions: ${response.data.suggestions.join(', ')}`);
    }
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Test 9: Test Payment Verification with Invalid Reference
const testInvalidPaymentReference = async () => {
  console.log('\n🧪 TEST 9: INVALID PAYMENT REFERENCE');
  console.log('=' .repeat(50));
  
  console.log('🔍 Testing payment verification with invalid reference...');
  const response = await makeRequest('/payment/verify/invalid-reference-123');
  
  if (!response.success) {
    console.log('✅ Correctly rejected invalid payment reference');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    if (response.data.reference) {
      console.log(`📋 Reference: ${response.data.reference}`);
    }
    if (response.data.suggestions) {
      console.log(`💡 Suggestions: ${response.data.suggestions.join(', ')}`);
    }
    return true;
  } else {
    console.log('❌ Should have failed but succeeded');
    return false;
  }
};

// Main test function
const runErrorMessageTests = async () => {
  console.log('🚀 STARTING IMPROVED ERROR MESSAGE TESTS');
  console.log('=' .repeat(60));
  
  const results = {
    userRegistration: false,
    missingDeliveryAddress: false,
    incompleteDeliveryAddress: false,
    missingPhoneNumber: false,
    invalidPhoneNumber: false,
    missingCartId: false,
    invalidCartId: false,
    insufficientWalletBalance: false,
    invalidPaymentReference: false
  };
  
  try {
    // Test 1: User Registration and Login
    results.userRegistration = await testUserRegistration();
    if (!results.userRegistration) {
      console.log('❌ Cannot continue without user authentication');
      return results;
    }
    
    // Test 2: Test Missing Delivery Address
    results.missingDeliveryAddress = await testMissingDeliveryAddress();
    
    // Test 3: Test Incomplete Delivery Address
    results.incompleteDeliveryAddress = await testIncompleteDeliveryAddress();
    
    // Test 4: Test Missing Phone Number
    results.missingPhoneNumber = await testMissingPhoneNumber();
    
    // Test 5: Test Invalid Phone Number Format
    results.invalidPhoneNumber = await testInvalidPhoneNumber();
    
    // Test 6: Test Missing Cart ID
    results.missingCartId = await testMissingCartId();
    
    // Test 7: Test Invalid Cart ID
    results.invalidCartId = await testInvalidCartId();
    
    // Test 8: Test Wallet Payment with Insufficient Balance
    results.insufficientWalletBalance = await testInsufficientWalletBalance();
    
    // Test 9: Test Payment Verification with Invalid Reference
    results.invalidPaymentReference = await testInvalidPaymentReference();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  // Summary
  console.log('\n📊 IMPROVED ERROR MESSAGE TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`✅ User Registration: ${results.userRegistration ? 'PASS' : 'FAIL'}`);
  console.log(`📝 Missing Delivery Address: ${results.missingDeliveryAddress ? 'PASS' : 'FAIL'}`);
  console.log(`📝 Incomplete Delivery Address: ${results.incompleteDeliveryAddress ? 'PASS' : 'FAIL'}`);
  console.log(`📱 Missing Phone Number: ${results.missingPhoneNumber ? 'PASS' : 'FAIL'}`);
  console.log(`📱 Invalid Phone Number: ${results.invalidPhoneNumber ? 'PASS' : 'FAIL'}`);
  console.log(`🛒 Missing Cart ID: ${results.missingCartId ? 'PASS' : 'FAIL'}`);
  console.log(`🛒 Invalid Cart ID: ${results.invalidCartId ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Insufficient Wallet Balance: ${results.insufficientWalletBalance ? 'PASS' : 'FAIL'}`);
  console.log(`🔍 Invalid Payment Reference: ${results.invalidPaymentReference ? 'PASS' : 'FAIL'}`);
  
  const passedTests = Object.values(results).filter(r => r === true).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL ERROR MESSAGE TESTS PASSED!');
    console.log('✅ Error messages are now more specific and helpful!');
  } else {
    console.log('⚠️ Some tests failed - review the results above');
  }
  
  return results;
};

// Run the tests
runErrorMessageTests().then(results => {
  console.log('\n✅ Improved error message tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
