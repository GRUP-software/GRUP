# WhatsApp Integration Documentation

## Overview

This document describes the WhatsApp Business API integration for automated order fulfillment messaging. The system sends interactive WhatsApp messages to customers when their orders are ready for pickup, allowing them to choose between pickup and delivery options.

## Features

- ✅ **Interactive Messages**: Send button-based messages for fulfillment choice
- ✅ **Webhook Processing**: Handle customer responses automatically
- ✅ **Order Tracking**: Link responses to specific tracking numbers
- ✅ **Admin Notifications**: Notify admins of customer choices
- ✅ **Message History**: Track all WhatsApp interactions
- ✅ **Fallback Support**: Handle text responses if buttons fail

## Architecture

### Components

1. **WhatsApp Service** (`services/whatsappService.js`)
   - Handles message sending and webhook processing
   - Manages message templates and responses
   - Tracks message delivery status

2. **WhatsApp Controller** (`controllers/whatsappController.js`)
   - Webhook verification and processing
   - Admin endpoints for manual message sending
   - Message status tracking

3. **Configuration** (`config/whatsapp.js`)
   - Centralized settings and templates
   - Pickup locations and delivery fees
   - Environment variable validation

4. **Database Schema** (`models/order.js`)
   - WhatsApp message tracking
   - Fulfillment choice storage
   - Response history

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# WhatsApp Business API Credentials
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
ADMIN_USER_ID=admin_user_id_for_notifications
```

### 2. Meta Business API Setup

1. **Create Meta Business Account**
   - Go to [Meta Business](https://business.facebook.com/)
   - Create a business account if you don't have one

2. **Set up WhatsApp Business API**
   - Navigate to WhatsApp > Getting Started
   - Add your business phone number
   - Complete business verification

3. **Get API Credentials**
   - Go to System Users > Create System User
   - Assign WhatsApp permissions
   - Generate access token

4. **Configure Webhook**
   - Set webhook URL: `https://yourdomain.com/api/webhook/whatsapp`
   - Set verify token (same as `WHATSAPP_VERIFY_TOKEN`)
   - Subscribe to `messages` events

### 3. Message Templates

Before sending interactive messages, you need to create message templates in Meta Business Manager:

1. Go to WhatsApp > Message Templates
2. Create template for fulfillment choice:
   - **Header**: "Order Ready! #{tracking_number}"
   - **Body**: "Your order is ready! Please choose your preferred fulfillment method:"
   - **Footer**: "Reply with your choice to proceed"
   - **Buttons**: 
     - "Pickup" (reply button)
     - "Delivery (+₦500)" (reply button)

## API Endpoints

### Webhook Endpoints

```
GET  /api/webhook/whatsapp    # Webhook verification
POST /api/webhook/whatsapp    # Incoming messages
```

### Admin Endpoints

```
POST /api/admin/whatsapp/send                    # Send manual message
GET  /api/admin/whatsapp/message/:messageId      # Get message status
GET  /api/admin/orders/:trackingNumber/whatsapp  # Get order WhatsApp history
```

### Manual Message Sending

```javascript
// Send fulfillment choice message
POST /api/admin/whatsapp/send
{
  "trackingNumber": "ORDER123456",
  "phoneNumber": "+2348012345678"
}
```

## Message Flow

### 1. Order Ready Trigger

When admin sets group buy status to "ready_for_pickup":

```javascript
// In groupBuyController.js
if (status === "ready_for_pickup") {
  // Send WhatsApp message to all order participants
  const whatsappResult = await whatsappService.sendFulfillmentChoiceMessage(
    userPhone,
    order.trackingNumber,
    orderDetails
  )
}
```

### 2. Customer Receives Message

Customer receives interactive message with:
- Order details (total, items)
- Two buttons: "Pickup" and "Delivery (+₦500)"
- Tracking number for reference

### 3. Customer Response

Customer clicks button or sends text:
- **Button Click**: Automatic processing via webhook
- **Text Response**: Parsed for keywords and tracking number

### 4. System Processing

```javascript
// In whatsappService.js
async handleButtonResponse(phoneNumber, buttonReply) {
  const [choice, trackingNumber] = buttonReply.id.split('_')
  
  // Update order status
  order.fulfillmentChoice = choice
  order.currentStatus = choice === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery'
  
  // Send confirmation message
  await this.sendConfirmationMessage(phoneNumber, trackingNumber, choice)
}
```

### 5. Admin Notification

Admin receives notification about customer choice:
```javascript
await notificationService.createNotification({
  userId: process.env.ADMIN_USER_ID,
  type: 'info',
  category: 'whatsapp',
  title: 'WhatsApp Fulfillment Choice',
  message: `Customer chose ${choice} for order #${trackingNumber}`
})
```

## Message Templates

### Fulfillment Choice Message

```json
{
  "messaging_product": "whatsapp",
  "to": "+2348012345678",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": {
      "type": "text",
      "text": "🎉 Order Ready! #ORDER123456"
    },
    "body": {
      "text": "Your order is ready! Please choose your preferred fulfillment method:\n\n📦 Order Total: ₦15,000\n📋 Items: 2"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "pickup_ORDER123456",
            "title": "🏪 Pickup"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "delivery_ORDER123456",
            "title": "🚚 Delivery (+₦500)"
          }
        }
      ]
    },
    "footer": {
      "text": "Reply with your choice to proceed"
    }
  }
}
```

### Confirmation Messages

**Pickup Confirmation:**
```
✅ Pickup confirmed! Please visit:
📍 Main Store Location - 123 Commerce Street
📞 Bring your tracking number: #ORDER123456
```

**Delivery Confirmation:**
```
✅ Delivery confirmed! We'll deliver to your address within 24 hours.
📞 Tracking: #ORDER123456
💳 Delivery fee: ₦500
```

## Database Schema

### Order Model Updates

```javascript
// WhatsApp integration tracking
whatsappMessages: [
  {
    messageId: String,
    type: {
      type: String,
      enum: ["fulfillment_choice", "confirmation", "help", "reminder"]
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent"
    },
    responseReceived: {
      type: Boolean,
      default: false
    },
    responseChoice: {
      type: String,
      enum: ["pickup", "delivery"]
    },
    responseAt: Date
  }
]
```

## Testing

### Run Test Script

```bash
node test-whatsapp-integration.mjs
```

### Test Configuration

Update `test-whatsapp-integration.mjs` with your test phone number:

```javascript
const testConfig = {
  phoneNumber: '+2348012345678', // Replace with real test number
  trackingNumber: 'TEST123456',
  orderDetails: {
    totalAmount: 15000,
    itemCount: 2,
    items: 'Test Product 1, Test Product 2'
  }
}
```

### Manual Testing

1. **Send Test Message:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/whatsapp/send \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "trackingNumber": "TEST123456",
       "phoneNumber": "+2348012345678"
     }'
   ```

2. **Check Message Status:**
   ```bash
   curl http://localhost:3000/api/admin/whatsapp/message/MESSAGE_ID \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

## Error Handling

### Common Issues

1. **Invalid Phone Number Format**
   - Ensure numbers are in international format (+234XXXXXXXXX)
   - Use `formatPhoneNumber()` helper function

2. **Webhook Verification Failed**
   - Check `WHATSAPP_VERIFY_TOKEN` matches Meta Business settings
   - Verify webhook URL is accessible

3. **Message Template Not Approved**
   - Submit templates for approval in Meta Business Manager
   - Wait for approval before testing

4. **Rate Limiting**
   - WhatsApp has rate limits (1000 messages/second)
   - Implement retry logic for failed messages

### Error Logging

All WhatsApp errors are logged with detailed information:

```javascript
logger.error(`❌ WhatsApp message error for ${trackingNumber}:`, error.response?.data || error.message)
```

## Security Considerations

1. **Webhook Signature Verification**
   - All incoming webhooks are verified using HMAC-SHA256
   - Invalid signatures are rejected

2. **Phone Number Validation**
   - Verify phone numbers match order records
   - Prevent unauthorized access to order information

3. **Environment Variables**
   - Never commit API tokens to version control
   - Use secure environment variable management

4. **Rate Limiting**
   - Implement rate limiting on webhook endpoints
   - Monitor for abuse and spam

## Monitoring and Analytics

### Key Metrics

- Message delivery rates
- Response rates by choice (pickup vs delivery)
- Average response time
- Failed message rates

### Logging

All WhatsApp interactions are logged with structured data:

```javascript
logger.info(`📱 WhatsApp fulfillment choice message sent to ${phoneNumber} for order ${trackingNumber}`)
logger.info(`✅ WhatsApp fulfillment choice processed: ${choice} for order ${trackingNumber}`)
```

## Troubleshooting

### Message Not Sending

1. Check environment variables are set correctly
2. Verify Meta Business API credentials
3. Ensure message template is approved
4. Check phone number format

### Webhook Not Receiving

1. Verify webhook URL is accessible
2. Check webhook verification token
3. Ensure proper SSL certificate
4. Monitor server logs for errors

### Customer Not Responding

1. Check message delivery status
2. Verify phone number is correct
3. Ensure customer has WhatsApp installed
4. Consider sending follow-up messages

## Future Enhancements

1. **Message Templates**: Add more message types (reminders, updates)
2. **Analytics Dashboard**: Visual reporting of WhatsApp metrics
3. **Automated Follow-ups**: Send reminder messages for unresponsive customers
4. **Multi-language Support**: Support for different languages
5. **Rich Media**: Send images and documents via WhatsApp
6. **Chatbot Integration**: More sophisticated conversation handling

## Support

For issues with the WhatsApp integration:

1. Check the logs for detailed error messages
2. Verify Meta Business API status
3. Test with the provided test script
4. Review this documentation for common solutions

## API Reference

### WhatsApp Service Methods

- `sendFulfillmentChoiceMessage(phoneNumber, trackingNumber, orderDetails)`
- `sendConfirmationMessage(phoneNumber, trackingNumber, choice, pickupLocation)`
- `processWebhook(webhookData)`
- `handleButtonResponse(phoneNumber, buttonReply)`
- `handleTextResponse(phoneNumber, text)`
- `sendHelpMessage(phoneNumber, trackingNumber)`
- `verifyWebhookSignature(body, signature)`
- `getMessageStatus(messageId)`

### Configuration Options

See `config/whatsapp.js` for all available configuration options including:
- Message templates
- Pickup locations
- Delivery settings
- Webhook configuration
- Tracking settings

