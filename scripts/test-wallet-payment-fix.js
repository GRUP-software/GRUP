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

// Test 3: Create a Test Cart
const createTestCart = async () => {
  console.log('\n🧪 TEST 3: CREATE TEST CART');
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

// Test 4: Test Wallet Payment with Valid Data
const testWalletPayment = async (cartId) => {
  console.log('\n🧪 TEST 4: TEST WALLET PAYMENT');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    cartId: cartId,
    paymentMethod: 'wallet_only',
    walletUse: 5 // Use ₦5 from wallet
  };
  
  console.log('💳 Testing wallet payment with valid data...');
  const response = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (response.success) {
    console.log('✅ Wallet payment successful!');
    console.log(`📝 Response:`, response.data);
    return true;
  } else {
    console.log('❌ Wallet payment failed');
    console.log(`📝 Error message: ${response.data.message}`);
    console.log(`📋 Details: ${response.data.details}`);
    if (response.data.suggestions) {
      console.log(`💡 Suggestions: ${response.data.suggestions.join(', ')}`);
    }
    return false;
  }
};

// Test 5: Check Final Wallet Balance
const testFinalWalletBalance = async () => {
  console.log('\n🧪 TEST 5: CHECK FINAL WALLET BALANCE');
  console.log('=' .repeat(50));
  
  const walletResponse = await makeRequest('/wallet');
  
  if (walletResponse.success) {
    console.log('✅ Final wallet data retrieved');
    console.log(`💰 Current balance: ₦${walletResponse.data.balance}`);
    console.log(`📊 Total earned: ₦${walletResponse.data.stats.totalEarned}`);
    console.log(`💸 Total spent: ₦${walletResponse.data.stats.totalSpent}`);
    
    // Show recent transactions
    console.log('\n📋 Recent transactions:');
    if (walletResponse.data.transactions.length > 0) {
      walletResponse.data.transactions.slice(0, 5).forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type.toUpperCase()}: ₦${tx.amount} (${tx.reason})`);
      });
    } else {
      console.log('   No transactions found');
    }
    
    return walletResponse.data;
  } else {
    console.log('❌ Failed to get final wallet data:', walletResponse.data.message);
    return null;
  }
};

// Main test function
const runWalletPaymentTests = async () => {
  console.log('🚀 STARTING WALLET PAYMENT FIX TESTS');
  console.log('=' .repeat(60));
  
  const results = {
    userRegistration: false,
    initialWallet: 0,
    cartCreated: null,
    walletPayment: false,
    finalWallet: null
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
    
    // Test 3: Create Test Cart
    results.cartCreated = await createTestCart();
    if (!results.cartCreated) {
      console.log('❌ Cannot continue without cart');
      return results;
    }
    
    // Test 4: Test Wallet Payment
    results.walletPayment = await testWalletPayment(results.cartCreated);
    
    // Test 5: Check Final Wallet Balance
    results.finalWallet = await testFinalWalletBalance();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  // Summary
  console.log('\n📊 WALLET PAYMENT FIX TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`✅ User Registration: ${results.userRegistration ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Initial Wallet: ₦${results.initialWallet}`);
  console.log(`🛒 Cart Created: ${results.cartCreated ? 'YES' : 'NO'}`);
  console.log(`💳 Wallet Payment: ${results.walletPayment ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Final Wallet Check: ${results.finalWallet ? 'PASS' : 'FAIL'}`);
  
  const passedTests = Object.values(results).filter(r => r === true || (typeof r === 'object' && r !== null)).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📈 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL WALLET PAYMENT TESTS PASSED!');
    console.log('✅ MongoDB transaction issue has been resolved!');
  } else {
    console.log('⚠️ Some tests failed - review the results above');
  }
  
  return results;
};

// Run the tests
runWalletPaymentTests().then(results => {
  console.log('\n✅ Wallet payment fix tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
