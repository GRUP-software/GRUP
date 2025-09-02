# Flutterwave Integration Guide

## Overview

This project has been successfully migrated from Paystack to Flutterwave while maintaining all existing cart and checkout logic. The integration supports the same three payment methods:

1. **`wallet_only`** - Uses only wallet balance
2. **`wallet_and_flutterwave`** - Partial wallet + Flutterwave payment
3. **`flutterwave_only`** - Standard Flutterwave payment

## Environment Configuration

### Required Environment Variables

```bash
# Flutterwave Configuration
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_test_secret_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your_test_public_key
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTyour_encryption_key
```

### Test vs Live Keys

- **Test Environment**: Use keys starting with `FLWSECK_TEST_` and `FLWPUBK_TEST_`
- **Live Environment**: Use keys starting with `FLWSECK_` and `FLWPUBK_`

## API Endpoints

### Payment Initialization

- **POST** `/api/payment/initialize`
- **POST** `/api/checkout`

### Webhook

- **POST** `/api/webhook/flutterwave`

## Payment Flow

### 1. Wallet + Flutterwave Payment

```javascript
{
  "paymentMethod": "wallet_and_flutterwave",
  "walletUse": 1000, // Amount in Naira
  "cartId": "cart_id",
  "deliveryAddress": {...},
  "phone": "phone_number"
}
```

**Response:**

```javascript
{
  "success": true,
  "message": "Partial wallet payment initialized, redirecting to Flutterwave",
  "authorization_url": "https://checkout.flutterwave.com/...",
  "reference": "internal_reference",
  "paymentHistoryId": "payment_history_id",
  "walletUse": 1000,
  "flutterwaveAmount": 500,
  "totalAmount": 1500,
  "currentWalletBalance": 2000,
  "message": "Wallet balance will be deducted after Flutterwave payment succeeds"
}
```

### 2. Flutterwave-Only Payment

```javascript
{
  "paymentMethod": "flutterwave_only",
  "cartId": "cart_id",
  "deliveryAddress": {...},
  "phone": "phone_number"
}
```

**Response:**

```javascript
{
  "success": true,
  "authorization_url": "https://checkout.flutterwave.com/...",
  "reference": "internal_reference",
  "paymentHistoryId": "payment_history_id",
  "amount": 1500,
  "walletUsed": 0,
  "totalAmount": 1500,
  "message": "Payment initialized successfully"
}
```

## Webhook Configuration

### Flutterwave Dashboard Setup

1. Go to your Flutterwave dashboard
2. Navigate to **Settings > Webhooks**
3. Add webhook URL: `https://yourdomain.com/api/webhook/flutterwave`
4. Set webhook events:
    - `charge.completed` - Successful payments
    - `charge.failed` - Failed payments

### Webhook Signature Verification

The webhook verifies signatures using HMAC SHA512:

```javascript
const hash = crypto
    .createHmac('sha512', process.env.FLUTTERWAVE_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
```

**Header**: `x-flutterwave-signature`

## Database Schema Updates

### PaymentHistory Model

```javascript
{
  // ... existing fields
  flutterwaveReference: String,    // Flutterwave transaction reference
  flutterwaveAmount: Number,       // Amount paid via Flutterwave
  // ... existing fields
}
```

### Migration

Run the migration script to update existing records:

```bash
cd backend
node scripts/migrate-to-flutterwave.js
```

## Frontend Integration

### Payment Method Selection

```javascript
const paymentMethods = [
    { value: 'wallet_only', label: 'Wallet Only' },
    { value: 'wallet_and_flutterwave', label: 'Wallet + Flutterwave' },
    { value: 'flutterwave_only', label: 'Flutterwave Only' },
];
```

### Payment Processing

```javascript
const response = await fetch('/api/payment/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        paymentMethod: 'wallet_and_flutterwave',
        walletUse: 1000,
        cartId: cartId,
        deliveryAddress: address,
        phone: phone,
    }),
});

if (response.success) {
    // Redirect to Flutterwave
    window.location.href = response.authorization_url;
}
```

## Error Handling

### Common Error Responses

```javascript
{
  "success": false,
  "message": "Payment service temporarily unavailable",
  "details": "Unable to connect to payment gateway. Please try again later.",
  "error": "Flutterwave API error: 400",
  "suggestions": [
    "Check your internet connection",
    "Try again in a few minutes",
    "Contact support if the issue persists"
  ]
}
```

### Error Scenarios

1. **Invalid API Keys**: Check environment variables
2. **Webhook Signature Mismatch**: Verify webhook configuration
3. **Amount Mismatch**: Ensure payment amounts match
4. **Network Issues**: Retry payment initialization

## Testing

### Test Cards

Use Flutterwave test cards for development:

- **Visa**: `4000 0000 0000 0002`
- **Mastercard**: `5200 8300 0000 0001`
- **Expiry**: Any future date
- **CVV**: Any 3 digits
- **PIN**: Any 4 digits

### Test Environment

1. Set `NODE_ENV=development`
2. Use test API keys
3. Test webhook with ngrok or similar tool

## Production Deployment

### Checklist

- [ ] Update environment variables with live keys
- [ ] Configure production webhook URL
- [ ] Test webhook signature verification
- [ ] Verify payment flow end-to-end
- [ ] Monitor webhook delivery
- [ ] Set up error monitoring

### Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **Environment Variables**: Use secure secret management
3. **HTTPS**: Ensure all endpoints use HTTPS
4. **Rate Limiting**: Implement API rate limiting
5. **Logging**: Monitor payment logs for anomalies

## Troubleshooting

### Common Issues

1. **Webhook Not Received**
    - Check webhook URL configuration
    - Verify server accessibility
    - Check webhook event settings

2. **Payment Initialization Fails**
    - Verify API keys
    - Check request payload
    - Validate amount format

3. **Signature Verification Fails**
    - Ensure correct secret key
    - Check webhook header name
    - Verify request body format

### Debug Mode

Enable debug logging by setting `LOG_LEVEL=debug` in environment variables.

## Support

For Flutterwave-specific issues:

- [Flutterwave Documentation](https://developer.flutterwave.com/)
- [Flutterwave Support](https://support.flutterwave.com/)

For application-specific issues:

- Check application logs
- Review webhook responses
- Verify database records
