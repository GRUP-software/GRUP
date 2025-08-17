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

// Test 2: Test Cart Not Found Error
const testCartNotFound = async () => {
  console.log('\n🧪 TEST 2: CART NOT FOUND ERROR');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    cartId: '507f1f77bcf86cd799439011', // Invalid cart ID
    paymentMethod: 'wallet_only',
    walletUse: 5
  };
  
  console.log('💳 Testing payment with invalid cart ID...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  console.log(`📊 Response Status: ${response.status}`);
  console.log(`📊 Success: ${response.success}`);
  
  if (!response.success && response.status === 404) {
    console.log('✅ Correctly returned 404 for cart not found');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    console.log(`📋 Cart ID: ${response.data.cartId}`);
    return true;
  } else if (!response.success && response.status === 500) {
    console.log('❌ Unexpected 500 error instead of 404');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    return false;
  } else {
    console.log('❌ Unexpected response');
    console.log(`📝 Response:`, response.data);
    return false;
  }
};

// Test 3: Test Missing Cart ID Error
const testMissingCartId = async () => {
  console.log('\n🧪 TEST 3: MISSING CART ID ERROR');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    // Missing cartId
    paymentMethod: 'wallet_only',
    walletUse: 5
  };
  
  console.log('💳 Testing payment with missing cart ID...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  console.log(`📊 Response Status: ${response.status}`);
  console.log(`📊 Success: ${response.success}`);
  
  if (!response.success && response.status === 400) {
    console.log('✅ Correctly returned 400 for missing cart ID');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    return true;
  } else {
    console.log('❌ Unexpected response');
    console.log(`📝 Response:`, response.data);
    return false;
  }
};

// Test 4: Test Delivery Address Validation
const testDeliveryAddressValidation = async () => {
  console.log('\n🧪 TEST 4: DELIVERY ADDRESS VALIDATION');
  console.log('=' .repeat(50));
  
  const paymentData = {
    // Missing deliveryAddress
    phone: '08012345678',
    cartId: 'test-cart-id',
    paymentMethod: 'wallet_only',
    walletUse: 5
  };
  
  console.log('💳 Testing payment with missing delivery address...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  console.log(`📊 Response Status: ${response.status}`);
  console.log(`📊 Success: ${response.success}`);
  
  if (!response.success && response.status === 400) {
    console.log('✅ Correctly returned 400 for missing delivery address');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    return true;
  } else {
    console.log('❌ Unexpected response');
    console.log(`📝 Response:`, response.data);
    return false;
  }
};

// Main test function
const runCartValidationTests = async () => {
  console.log('🚀 STARTING CART VALIDATION TESTS');
  console.log('=' .repeat(60));
  
  const results = {
    userRegistration: false,
    cartNotFound: false,
    missingCartId: false,
    deliveryAddressValidation: false
  };
  
  try {
    // Test 1: User Registration and Login
    results.userRegistration = await testUserRegistration();
    if (!results.userRegistration) {
      console.log('❌ Cannot continue without user authentication');
      return results;
    }
    
    // Test 2: Test Cart Not Found Error
    results.cartNotFound = await testCartNotFound();
    
    // Test 3: Test Missing Cart ID Error
    results.missingCartId = await testMissingCartId();
    
    // Test 4: Test Delivery Address Validation
    results.deliveryAddressValidation = await testDeliveryAddressValidation();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  // Summary
  console.log('\n📊 CART VALIDATION TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`✅ User Registration: ${results.userRegistration ? 'PASS' : 'FAIL'}`);
  console.log(`🛒 Cart Not Found (404): ${results.cartNotFound ? 'PASS' : 'FAIL'}`);
  console.log(`🛒 Missing Cart ID (400): ${results.missingCartId ? 'PASS' : 'FAIL'}`);
  console.log(`📝 Delivery Address Validation: ${results.deliveryAddressValidation ? 'PASS' : 'FAIL'}`);
  
  const passedTests = Object.values(results).filter(r => r === true).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL CART VALIDATION TESTS PASSED!');
    console.log('✅ Cart validation is working correctly!');
    console.log('✅ Error messages are specific and helpful!');
  } else {
    console.log('⚠️ Some tests failed - review the results above');
  }
  
  return results;
};

// Run the tests
runCartValidationTests().then(results => {
  console.log('\n✅ Cart validation tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
