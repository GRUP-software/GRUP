# Frontend Integration Guide - Wallet & Cart System

## 🎯 **What's Been Fixed & Implemented**

### ✅ **Critical Issues Resolved:**

1. **Premature Wallet Deduction** - Wallet balance is now only deducted after successful payment confirmation
2. **Referral Bonus Logic** - Proper ₦500 bonus for every 3 referrals with accumulation
3. **Transaction Tracking** - Complete audit trail with metadata for all wallet activities
4. **Data Consistency** - All wallet and cart operations maintain data integrity

### ✅ **Business Logic Implemented:**

1. **Referral Bonus System**: ₦500 for every 3 referrals (3 = ₦500, 6 = ₦1000, 9 = ₦1500)
2. **Wallet Usage**: Can be used for partial or full payment offsets
3. **Payment Flow**: Safe wallet deduction only after successful payment
4. **Transaction History**: Complete tracking with order and group buy references

---

## 📋 **APIs Available for Frontend Integration**

### **1. Wallet APIs**

- `GET /api/wallet` - Get wallet data with transactions and stats
- `POST /api/wallet/calculate-offset` - Calculate wallet usage for purchases
- `GET /api/wallet/transactions` - Get filtered transaction history

### **2. Cart APIs**

- `GET /api/cart` - Get cart with wallet integration
- `POST /api/cart/add` - Add items to cart
- `PATCH /api/cart/update-quantity` - Update cart quantities
- `DELETE /api/cart/remove` - Remove items from cart
- `DELETE /api/cart/clear` - Clear entire cart

### **3. Payment APIs**

- `POST /api/payment/initialize` - Initialize payment with wallet integration

### **4. Referral APIs**

- `GET /api/referral/info` - Get referral information
- `GET /api/referral/stats` - Get referral statistics
- `GET /api/referral/validate/:code` - Validate referral codes

---

## 🔧 **Key Implementation Changes**

### **1. Payment Method Detection**

```javascript
// Frontend should send paymentMethod parameter:
{
  "paymentMethod": "wallet_only" | "wallet_and_flutterwave" | "flutterwave_only",
  "walletUse": 1000, // Amount to use from wallet
  // ... other payment data
}
```

### **2. Updated Response Formats**

```javascript
// Wallet-only payment response:
{
  "success": true,
  "message": "Payment completed successfully using wallet",
  "paymentId": "payment_id",
  "groupBuysJoined": 1,
  "walletUsed": 1000,
  "totalAmount": 1000,
  "newWalletBalance": 500,
  "groupBuys": [...]
}

// Partial wallet + Flutterwave response:
{
  "success": true,
  "message": "Partial wallet payment initialized, redirecting to Flutterwave",
  "authorization_url": "https://checkout.flutterwave.com/...",
  "walletUse": 1000,
  "flutterwaveAmount": 500,
  "currentWalletBalance": 1500, // Not deducted yet
  "message": "Wallet balance will be deducted after Flutterwave payment succeeds"
}
```

### **3. Enhanced Wallet Data**

```javascript
// GET /api/wallet response:
{
  "balance": 1500,
  "transactions": [...],
  "stats": {
    "referralEarnings": 1500,
    "totalEarned": 2000,
    "totalSpent": 500,
    "netBalance": 1500
  },
  "referralInfo": {
    "referralCode": "abc123",
    "totalReferrals": 6,
    "referralStats": {
      "totalReferrals": 6,
      "totalBonusesEarned": 1500,
      "lastBonusAt": 6,
      "nextBonusAt": 9
    }
  }
}
```

---

## 🚀 **Frontend Implementation Steps**

### **Step 1: Wallet Integration**

```javascript
// Get wallet data
const getWalletData = async () => {
  const response = await fetch("/api/wallet", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  // Use data.balance, data.stats, data.referralInfo
  return data;
};

// Calculate wallet offset for checkout
const calculateWalletOffset = async (totalAmount, requestedWalletUse) => {
  const response = await fetch("/api/wallet/calculate-offset", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ totalAmount, requestedWalletUse }),
  });
  return await response.json();
};
```

### **Step 2: Payment Integration**

```javascript
// Initialize payment with wallet integration
const initializePayment = async (paymentData) => {
  const response = await fetch("/api/payment/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentMethod: paymentData.paymentMethod, // 'wallet_only' | 'wallet_and_flutterwave' | 'flutterwave_only'
      walletUse: paymentData.walletUse,
      deliveryAddress: paymentData.deliveryAddress,
      phone: paymentData.phone,
      cartId: paymentData.cartId,
      callback_url: paymentData.callback_url,
    }),
  });

  const data = await response.json();

  if (data.success) {
    if (data.authorization_url) {
      // Redirect to Flutterwave
      window.location.href = data.authorization_url;
    } else {
      // Wallet-only payment completed
      handlePaymentSuccess(data);
    }
  } else {
    handlePaymentError(data);
  }
};
```

### **Step 3: Transaction History**

```javascript
// Get transaction history with filters
const getTransactionHistory = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.reason) params.append("reason", filters.reason);
  if (filters.page) params.append("page", filters.page);
  if (filters.limit) params.append("limit", filters.limit);

  const response = await fetch(`/api/wallet/transactions?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await response.json();
};
```

---

## 🎨 **UI/UX Recommendations**

### **1. Wallet Display**

```javascript
// Show wallet balance prominently
<div className="wallet-balance">
  <h3>Wallet Balance</h3>
  <div className="balance-amount">₦{walletData.balance}</div>
  <div className="wallet-stats">
    <span>Total Earned: ₦{walletData.stats.totalEarned}</span>
    <span>Total Spent: ₦{walletData.stats.totalSpent}</span>
  </div>
</div>
```

### **2. Payment Method Selection**

```javascript
// Payment method selector
<select onChange={(e) => setPaymentMethod(e.target.value)}>
  <option value="flutterwave_only">Flutterwave Only</option>
<option value="wallet_and_flutterwave">Wallet + Flutterwave</option>
  <option value="wallet_only">Wallet Only</option>
</select>

// Wallet usage slider
<input
  type="range"
  min="0"
  max={maxWalletUse}
  value={walletUse}
  onChange={(e) => setWalletUse(parseInt(e.target.value))}
/>
<span>₦{walletUse} from wallet</span>
```

### **3. Transaction History**

```javascript
// Transaction list with metadata
{
  transactions.map((transaction) => (
    <div key={transaction.id} className="transaction-item">
      <div className="transaction-type">{transaction.type}</div>
      <div className="transaction-amount">₦{transaction.amount}</div>
      <div className="transaction-description">{transaction.description}</div>
      <div className="transaction-date">
        {formatDate(transaction.createdAt)}
      </div>
      {transaction.metadata.orderTrackingNumber && (
        <div className="transaction-order">
          Order: {transaction.metadata.orderTrackingNumber}
        </div>
      )}
    </div>
  ));
}
```

---

## ⚠️ **Important Notes for Frontend Developer**

### **1. Wallet Deduction Timing**

- **Wallet-only payments**: Deducted immediately
- **Partial wallet + Flutterwave**: Deducted only after Flutterwave success
- **Flutterwave-only**: No wallet deduction

### **2. Error Handling**

```javascript
// Handle payment errors
const handlePaymentError = (error) => {
  if (error.message === "Insufficient wallet balance") {
    showError("You don't have enough wallet balance for this payment");
  } else if (error.walletDeduction === "none") {
    showError("No wallet amount was deducted. Please try again.");
  }
};
```

### **3. Referral Bonus Display**

```javascript
// Show referral progress
<div className="referral-progress">
  <div className="progress-bar">
    <div
      className="progress-fill"
      style={{ width: `${((referralInfo.totalReferrals % 3) / 3) * 100}%` }}
    ></div>
  </div>
  <span>{referralInfo.totalReferrals}/3 referrals</span>
  <span>Next bonus at: {referralInfo.referralStats.nextBonusAt} referrals</span>
</div>
```

### **4. Cart Integration**

```javascript
// Cart with wallet integration
const CartComponent = () => {
  const [cartData, setCartData] = useState(null);
  const [walletUse, setWalletUse] = useState(0);

  useEffect(() => {
    // Get cart data with wallet balance
    fetchCartData();
  }, []);

  const handleCheckout = () => {
    const paymentData = {
      paymentMethod:
        walletUse >= cartData.totalPrice
          ? "wallet_only"
          : "wallet_and_flutterwave",
      walletUse: walletUse,
      // ... other payment data
    };
    initializePayment(paymentData);
  };
};
```

---

## 🧪 **Testing Checklist**

### **Frontend Testing:**

- [ ] Wallet balance displays correctly
- [ ] Payment method selection works
- [ ] Wallet usage slider functions properly
- [ ] Transaction history shows all data
- [ ] Referral progress displays correctly
- [ ] Error messages are user-friendly
- [ ] Payment flow works for all methods
- [ ] Cart integration with wallet works

### **Integration Testing:**

- [ ] Wallet-only payments complete successfully
- [ ] Partial wallet + Flutterwave redirects correctly
- [ ] Flutterwave-only payments work normally
- [ ] Transaction records are created properly
- [ ] Referral bonuses are tracked correctly
- [ ] Cart clears after successful payment

---

## 📞 **Support & Questions**

If you have any questions about the implementation:

1. **Check the API documentation** in `API_DOCUMENTATION.md`
2. **Review the business logic rules** in the documentation
3. **Test all payment scenarios** before going live
4. **Ensure proper error handling** for all edge cases

The backend is now production-ready with comprehensive wallet and cart functionality! 🎉
