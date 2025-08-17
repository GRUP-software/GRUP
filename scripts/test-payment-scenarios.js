import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';
let authToken = null;
let testUserId = null;

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
    testUserId = registerResponse.data.user._id;
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

// Test 3: Add Items to Cart
const testAddToCart = async () => {
  console.log('\n🧪 TEST 3: ADD ITEMS TO CART');
  console.log('=' .repeat(50));
  
  // First, get available products
  console.log('📦 Getting available products...');
  const productsResponse = await makeRequest('/products');
  
  if (!productsResponse.success) {
    console.log('❌ Failed to get products:', productsResponse.data.message);
    return null;
  }
  
  const products = productsResponse.data;
  if (products.length === 0) {
    console.log('❌ No products available');
    return null;
  }
  
  const product = products[0];
  console.log(`✅ Found product: ${product.title} - ₦${product.price}`);
  
  // Add to cart
  console.log('🛒 Adding product to cart...');
  const cartResponse = await makeRequest('/cart/add', 'POST', {
    productId: product._id,
    quantity: 2
  });
  
  if (cartResponse.success) {
    console.log('✅ Product added to cart');
    return cartResponse.data._id; // Return cart ID
  } else {
    console.log('❌ Failed to add to cart:', cartResponse.data.message);
    return null;
  }
};

// Test 4: Wallet-Only Payment (Scenario 1)
const testWalletOnlyPayment = async (cartId) => {
  console.log('\n🧪 TEST 4: WALLET-ONLY PAYMENT');
  console.log('=' .repeat(50));
  
  const paymentData = {
    deliveryAddress: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State'
    },
    phone: '08012345678',
    useWallet: true,
    cartId: cartId,
    paymentMethod: 'wallet_only',
    walletUse: 1000 // Use ₦1000 from wallet
  };
  
  console.log('💳 Initializing wallet-only payment...');
  const paymentResponse = await makeRequest('/payment/initialize', 'POST', paymentData);
  
  if (paymentResponse.success) {
    console.log('✅ Wallet-only payment successful');
    console.log(`💰 Wallet used: ₦${paymentResponse.data.walletUsed}`);
    console.log(`📦 Order created: ${paymentResponse.data.orderId}`);
    console.log(`📋 Tracking number: ${paymentResponse.data.trackingNumber}`);
    return paymentResponse.data;
  } else {
    console.log('❌ Wallet-only payment failed:', paymentResponse.data.message);
    return null;
  }
};

// Test 5: Paystack-Only Payment (Scenario 2)
const testPaystackOnlyPayment = async (cartId) => {
  console.log('\n🧪 TEST 5: PAYSTACK-ONLY PAYMENT');
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
    return paymentResponse.data;
  } else {
    console.log('❌ Paystack payment failed:', paymentResponse.data.message);
    return null;
  }
};

// Test 6: Partial Wallet + Paystack Payment (Scenario 3)
const testPartialWalletPayment = async (cartId) => {
  console.log('\n🧪 TEST 6: PARTIAL WALLET + PAYSTACK PAYMENT');
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
    return paymentResponse.data;
  } else {
    console.log('❌ Partial payment failed:', paymentResponse.data.message);
    return null;
  }
};

// Test 7: Insufficient Wallet Balance (Scenario 4)
const testInsufficientWalletBalance = async (cartId) => {
  console.log('\n🧪 TEST 7: INSUFFICIENT WALLET BALANCE');
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

// Test 8: Check Final Wallet Balance
const testFinalWalletBalance = async () => {
  console.log('\n🧪 TEST 8: CHECK FINAL WALLET BALANCE');
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

// Test 9: Get Payment History
const testPaymentHistory = async () => {
  console.log('\n🧪 TEST 9: GET PAYMENT HISTORY');
  console.log('=' .repeat(50));
  
  const historyResponse = await makeRequest('/payment/history');
  
  if (historyResponse.success) {
    console.log('✅ Payment history retrieved');
    console.log(`📊 Total payments: ${historyResponse.data.data.length}`);
    
    historyResponse.data.data.forEach((payment, index) => {
      console.log(`   ${index + 1}. ${payment.referenceId} - ${payment.status} - ₦${payment.amount}`);
    });
    
    return historyResponse.data;
  } else {
    console.log('❌ Failed to get payment history:', historyResponse.data.message);
    return null;
  }
};

// Main test function
const runAllTests = async () => {
  console.log('🚀 STARTING COMPREHENSIVE PAYMENT SCENARIO TESTS');
  console.log('=' .repeat(60));
  
  const results = {
    userRegistration: false,
    initialWallet: 0,
    cartCreated: null,
    walletOnlyPayment: null,
    paystackOnlyPayment: null,
    partialPayment: null,
    insufficientBalance: false,
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
    
    // Test 3: Add Items to Cart
    results.cartCreated = await testAddToCart();
    if (!results.cartCreated) {
      console.log('❌ Cannot continue without cart');
      return results;
    }
    
    // Test 4: Wallet-Only Payment
    results.walletOnlyPayment = await testWalletOnlyPayment(results.cartCreated);
    
    // Test 5: Paystack-Only Payment (will need new cart)
    const cart2 = await testAddToCart();
    if (cart2) {
      results.paystackOnlyPayment = await testPaystackOnlyPayment(cart2);
    }
    
    // Test 6: Partial Wallet + Paystack Payment (will need new cart)
    const cart3 = await testAddToCart();
    if (cart3) {
      results.partialPayment = await testPartialWalletPayment(cart3);
    }
    
    // Test 7: Insufficient Wallet Balance (will need new cart)
    const cart4 = await testAddToCart();
    if (cart4) {
      results.insufficientBalance = await testInsufficientWalletBalance(cart4);
    }
    
    // Test 8: Check Final Wallet Balance
    results.finalWallet = await testFinalWalletBalance();
    
    // Test 9: Get Payment History
    results.paymentHistory = await testPaymentHistory();
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  // Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ User Registration: ${results.userRegistration ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Initial Wallet: ₦${results.initialWallet}`);
  console.log(`🛒 Cart Created: ${results.cartCreated ? 'YES' : 'NO'}`);
  console.log(`💳 Wallet-Only Payment: ${results.walletOnlyPayment ? 'PASS' : 'FAIL'}`);
  console.log(`💳 Paystack-Only Payment: ${results.paystackOnlyPayment ? 'PASS' : 'FAIL'}`);
  console.log(`💳 Partial Payment: ${results.partialPayment ? 'PASS' : 'FAIL'}`);
  console.log(`❌ Insufficient Balance Test: ${results.insufficientBalance ? 'PASS' : 'FAIL'}`);
  console.log(`💰 Final Wallet Check: ${results.finalWallet ? 'PASS' : 'FAIL'}`);
  console.log(`📊 Payment History: ${results.paymentHistory ? 'PASS' : 'FAIL'}`);
  
  return results;
};

// Run the tests
runAllTests().then(results => {
  console.log('\n✅ All payment scenario tests completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
