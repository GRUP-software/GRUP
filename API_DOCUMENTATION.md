# Wallet & Cart System API Documentation

## Overview

This document provides comprehensive API documentation for the wallet and cart system, including referral bonuses, payment processing, and transaction history.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <jwt_token>
```

---

## 1. Wallet APIs

### 1.1 Get Wallet Data

**GET** `/wallet`

Returns comprehensive wallet information including balance, transactions, and referral stats.

**Response:**

```json
{
    "balance": 1500,
    "transactions": [
        {
            "id": "transaction_id",
            "type": "credit|debit",
            "amount": 500,
            "reason": "REFERRAL_BONUS|ORDER|REFUND",
            "description": "Referral bonus for inviting 3 users",
            "createdAt": "2024-01-15T10:30:00Z",
            "metadata": {
                "orderId": "order_id",
                "orderTrackingNumber": "TRK123456",
                "groupBuyId": "groupbuy_id",
                "groupBuyStatus": "active",
                "referralCount": 3
            }
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 50,
        "pages": 3,
        "hasNext": true,
        "hasPrev": false
    },
    "stats": {
        "referralEarnings": 1500,
        "totalEarned": 2000,
        "totalSpent": 500,
        "netBalance": 1500
    },
    "referralInfo": {
        "referralCode": "abc123",
        "hasReceivedBonus": true,
        "totalReferrals": 6,
        "referralsNeeded": 0,
        "referralStats": {
            "totalReferrals": 6,
            "totalBonusesEarned": 1500,
            "lastBonusAt": 6,
            "nextBonusAt": 9
        }
    }
}
```

### 1.2 Calculate Wallet Offset

**POST** `/wallet/calculate-offset`

Calculate how much wallet balance can be used for a purchase.

**Request:**

```json
{
    "totalAmount": 2000,
    "requestedWalletUse": 1000
}
```

**Response:**

```json
{
    "walletBalance": 1500,
    "maxWalletUse": 1500,
    "walletUsed": 1000,
    "remainingToPay": 1000,
    "canUseWallet": true,
    "message": "Wallet can be used for payment"
}
```

### 1.3 Get Transaction History

**GET** `/wallet/transactions`

Get filtered transaction history with pagination.

**Query Parameters:**

- `type`: credit|debit
- `reason`: REFERRAL_BONUS|ORDER|REFUND
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**

```json
{
    "transactions": [
        {
            "id": "transaction_id",
            "type": "credit",
            "amount": 500,
            "reason": "REFERRAL_BONUS",
            "description": "Referral bonus for inviting 3 users",
            "createdAt": "2024-01-15T10:30:00Z",
            "metadata": {
                "orderId": "order_id",
                "orderTrackingNumber": "TRK123456",
                "groupBuyId": "groupbuy_id",
                "groupBuyStatus": "active",
                "referralCount": 3
            }
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 50,
        "pages": 3,
        "hasNext": true,
        "hasPrev": false
    }
}
```

---

## 2. Cart APIs

### 2.1 Get Cart

**GET** `/cart`

Get user's current cart with wallet integration.

**Response:**

```json
{
    "items": [
        {
            "id": "item_id",
            "product": {
                "id": "product_id",
                "title": "Product Name",
                "price": 1000,
                "image": "image_url"
            },
            "quantity": 2,
            "unitPrice": 1000,
            "totalPrice": 2000,
            "variant": "Large",
            "sellingUnit": {
                "optionName": "Half Bag",
                "pricePerUnit": 1000
            }
        }
    ],
    "totalPrice": 2000,
    "itemCount": 2,
    "walletBalance": 1500,
    "maxWalletUse": 1500,
    "remainingAfterWallet": 500,
    "cartId": "cart_id"
}
```

### 2.2 Add to Cart

**POST** `/cart/add`

Add item to cart.

**Request:**

```json
{
    "productId": "product_id",
    "quantity": 2,
    "variant": "Large",
    "sellingUnit": "half_bag"
}
```

**Response:**

```json
{
  "message": "Item added to cart successfully",
  "items": [...],
  "totalPrice": 2000,
  "itemCount": 2,
  "walletBalance": 1500,
  "maxWalletUse": 1500,
  "remainingAfterWallet": 500,
  "cartId": "cart_id"
}
```

### 2.3 Update Cart Quantity

**PATCH** `/cart/update-quantity`

Update item quantity in cart.

**Request:**

```json
{
    "productId": "product_id",
    "quantity": 3,
    "variant": "Large",
    "sellingUnitName": "half_bag"
}
```

### 2.4 Remove from Cart

**DELETE** `/cart/remove`

Remove item from cart.

**Request:**

```json
{
    "productId": "product_id",
    "variant": "Large",
    "sellingUnitName": "half_bag"
}
```

### 2.5 Clear Cart

**DELETE** `/cart/clear`

Clear all items from cart.

---

## 3. Payment APIs

### 3.1 Initialize Payment

**POST** `/payment/initialize`

Initialize payment with wallet integration.

**Request:**

```json
{
    "paymentMethod": "wallet_only|wallet_and_flutterwave|flutterwave_only",
    "walletUse": 1000,
    "deliveryAddress": {
        "street": "123 Main St",
        "city": "Lagos",
        "state": "Lagos"
    },
    "phone": "+2348012345678",
    "cartId": "cart_id",
    "callback_url": "http://localhost:4000/account"
}
```

**Response for Wallet-Only Payment:**

```json
{
    "success": true,
    "message": "Payment completed successfully using wallet",
    "paymentId": "payment_id",
    "groupBuysJoined": 1,
    "walletUsed": 1000,
    "totalAmount": 1000,
    "newWalletBalance": 500,
    "groupBuys": [
        {
            "id": "groupbuy_id",
            "productId": "product_id",
            "status": "active",
            "unitsSold": 2,
            "minimumViableUnits": 20
        }
    ]
}
```

**Response for Partial Wallet + Flutterwave:**

```json
{
    "success": true,
    "message": "Partial wallet payment initialized, redirecting to Flutterwave",
    "authorization_url": "https://checkout.flutterwave.com/...",
    "reference": "GRP_abc123_1234567890",
    "paymentHistoryId": "payment_history_id",
    "walletUse": 1000,
    "flutterwaveAmount": 500,
    "totalAmount": 1500,
    "currentWalletBalance": 1500,
    "message": "Wallet balance will be deducted after Flutterwave payment succeeds"
}
```

**Response for Flutterwave-Only:**

```json
{
    "success": true,
    "authorization_url": "https://checkout.flutterwave.com/...",
    "reference": "GRP_abc123_1234567890",
    "paymentHistoryId": "payment_history_id",
    "amount": 1500,
    "walletUsed": 0,
    "totalAmount": 1500,
    "message": "Payment initialized successfully"
}
```

---

## 4. Referral APIs

### 4.1 Get Referral Info

**GET** `/referral/info`

Get user's referral information.

**Response:**

```json
{
    "referralCode": "abc123",
    "referralLink": "http://localhost:4000/register?ref=abc123",
    "referredUsers": [
        {
            "id": "user_id",
            "name": "John Doe",
            "email": "john@example.com",
            "joinedAt": "2024-01-15T10:30:00Z",
            "status": "active",
            "hasMadePurchase": true,
            "purchaseAmount": 2500
        }
    ],
    "hasReceivedBonus": true,
    "referralCount": 6,
    "totalEarnings": 1500,
    "nextBonusThreshold": 9
}
```

### 4.2 Get Referral Stats

**GET** `/referral/stats`

Get detailed referral statistics.

**Response:**

```json
{
    "totalReferrals": 6,
    "bonusEarned": 1500,
    "nextBonusAt": 9,
    "remainingForBonus": 3,
    "totalEarnings": 1500,
    "nextBonusThreshold": 9,
    "referralHistory": [
        {
            "id": "ref_1",
            "referredUser": "John Doe",
            "joinedAt": "2024-01-15T10:30:00Z",
            "status": "active",
            "hasMadePurchase": true,
            "purchaseAmount": 2500
        }
    ]
}
```

### 4.3 Validate Referral Code

**GET** `/referral/validate/:referralCode`

Validate a referral code.

**Response:**

```json
{
    "valid": true,
    "referrer": {
        "name": "Jane Doe",
        "referralCode": "abc123"
    },
    "message": "You will be referred by Jane Doe"
}
```

---

## 5. Business Logic Rules

### 5.1 Referral Bonus System

- **Bonus Amount**: ₦500 for every 3 referrals
- **Usage**: Can only be used for purchase payments
- **Withdrawal**: Cannot be withdrawn as cash
- **Accumulation**: Bonuses accumulate (6 referrals = ₦1000, 9 referrals = ₦1500)

### 5.2 Wallet Usage Rules

- **Partial Payments**: Can use wallet for partial payment + Flutterwave
- **Deduction Timing**: Wallet only deducted after successful payment confirmation
- **Balance Validation**: System validates sufficient balance before payment
- **Transaction Records**: All wallet activities are recorded with metadata

### 5.3 Payment Flow

1. **Wallet-Only**: Immediate completion, wallet deducted immediately
2. **Partial Wallet**: Wallet validated but not deducted until Flutterwave succeeds
3. **Flutterwave-Only**: Standard Flutterwave flow

### 5.4 Data Consistency

- All wallet transactions include metadata (order ID, group buy ID, etc.)
- Referral bonuses are tracked with referral count
- Cart updates include wallet balance information
- Transaction history provides complete audit trail

---

## 6. Error Handling

### 6.1 Common Error Responses

```json
{
    "success": false,
    "message": "Error description",
    "error": "Detailed error message"
}
```

### 6.2 Specific Error Cases

- **Insufficient Wallet Balance**: `"Insufficient wallet balance"`
- **Invalid Payment Method**: `"Invalid payment method"`
- **Cart Empty**: `"Cannot checkout with an empty cart"`
- **Invalid Referral Code**: `"Invalid referral code"`

---

## 7. Frontend Integration Guide

### 7.1 Wallet Integration

```javascript
// Get wallet data
const walletData = await fetch('/api/wallet', {
    headers: { Authorization: `Bearer ${token}` },
});

// Calculate wallet offset
const offset = await fetch('/api/wallet/calculate-offset', {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ totalAmount: 2000, requestedWalletUse: 1000 }),
});
```

### 7.2 Payment Integration

```javascript
// Initialize payment
const payment = await fetch('/api/payment/initialize', {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        paymentMethod: 'wallet_and_flutterwave',
        walletUse: 1000,
        deliveryAddress: {
            street: '123 Main St',
            city: 'Lagos',
            state: 'Lagos',
        },
        phone: '+2348012345678',
        cartId: cartId,
    }),
});

const paymentData = await payment.json();

if (paymentData.success) {
    if (paymentData.authorization_url) {
        // Redirect to Flutterwave
        window.location.href = paymentData.authorization_url;
    } else {
        // Wallet-only payment completed
        console.log('Payment completed:', paymentData);
    }
}
```

### 7.3 Transaction History

```javascript
// Get transaction history with filters
const transactions = await fetch(
    '/api/wallet/transactions?type=credit&reason=REFERRAL_BONUS&page=1&limit=20',
    {
        headers: { Authorization: `Bearer ${token}` },
    }
);
```

---

## 8. Testing Scenarios

### 8.1 Referral Bonus Testing

1. Create user with referral code
2. Register 3 users with that referral code
3. Verify ₦500 bonus is added to referrer's wallet
4. Register 3 more users
5. Verify another ₦500 bonus is added

### 8.2 Payment Testing

1. Add items to cart
2. Test wallet-only payment
3. Test partial wallet + Flutterwave payment
4. Test Flutterwave-only payment
5. Verify wallet balance updates correctly
6. Verify transaction records are created

### 8.3 Error Testing

1. Test insufficient wallet balance
2. Test invalid payment methods
3. Test empty cart checkout
4. Test invalid referral codes

---

This API documentation provides everything needed for frontend integration with the updated wallet and cart system.
