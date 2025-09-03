# 🔔 Notification System Documentation

## Overview

The Grup notification system provides comprehensive in-app and email notifications for user actions and admin activities. The system automatically sends notifications when admin actions affect user accounts, ensuring users stay informed about their orders, group buys, and account activities.

## Features

### ✅ In-App Notifications

- Real-time notifications via WebSocket
- Notification center with read/unread status
- Categorized notifications (order, group_buy, payment, wallet, etc.)
- Action buttons for quick navigation

### ✅ Email Notifications

- Beautiful HTML email templates
- Automatic email sending for all admin actions
- Configurable email service (SMTP)
- Fallback logging when email service is not configured

### ✅ Admin Action Notifications

- Order status updates
- Group buy status changes
- Order cancellations
- Refund processing
- Delivery scheduling
- Pickup readiness

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=Grup Team
```

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
    - Go to Google Account settings
    - Security → 2-Step Verification → App passwords
    - Generate password for "Mail"
3. Use the generated password as `EMAIL_PASS`

### Other SMTP Providers

The system supports any SMTP provider. Update the environment variables accordingly:

```env
# For Outlook/Hotmail
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587

# For Yahoo
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587

# For custom SMTP
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
```

## Email Templates

### Order Status Update

- **Template**: `order_status_update`
- **Trigger**: Admin updates order status
- **Content**: Order details, status, tracking number, action buttons

### Group Buy Status Update

- **Template**: `group_buy_status_update`
- **Trigger**: Admin updates group buy status
- **Content**: Product details, status change, fulfillment information

### Payment Confirmation

- **Template**: `payment_confirmation`
- **Trigger**: Payment processing
- **Content**: Payment details, order information, tracking link

### Refund Notification

- **Template**: `refund_notification`
- **Trigger**: Refund processing
- **Content**: Refund amount, reason, wallet update

### Admin Action Notification

- **Template**: `admin_action_notification`
- **Trigger**: Any admin action affecting user
- **Content**: Action details, admin name, timestamp, relevant data

## Admin Actions That Trigger Notifications

### Order Management

#### 1. Update Order Status

```javascript
// Endpoint: PUT /api/orders/admin/:trackingNumber/status
{
  "status": "processing",
  "message": "Order is now being processed",
  "notifyCustomer": true
}
```

#### 2. Cancel Order

```javascript
// Endpoint: POST /api/admin/orders/:trackingNumber/cancel
{
  "reason": "Out of stock"
}
```

#### 3. Process Refund

```javascript
// Endpoint: POST /api/admin/orders/:trackingNumber/refund
{
  "amount": 5000,
  "reason": "Customer request"
}
```

#### 4. Schedule Delivery

```javascript
// Endpoint: POST /api/admin/orders/:trackingNumber/schedule-delivery
{
  "deliveryInfo": "Delivery scheduled for tomorrow between 2-4 PM",
  "scheduledDate": "2024-01-15T14:00:00Z"
}
```

#### 5. Mark Ready for Pickup

```javascript
// Endpoint: POST /api/admin/orders/:trackingNumber/ready-pickup
{
  "pickupLocation": "Main Store - 123 Commerce Street"
}
```

### Group Buy Management

#### 1. Update Group Buy Status

```javascript
// Endpoint: PUT /api/groupbuy/admin/:id/status
{
  "status": "processing",
  "notes": "Group buy approved for processing",
  "deliveryMethod": "pickup",
  "pickupLocation": "Main Store"
}
```

## Notification Service Methods

### Core Methods

```javascript
// Create in-app notification
await notificationService.createNotification({
    userId: user._id,
    type: 'success',
    category: 'order',
    title: 'Order Updated',
    message: 'Your order status has been updated',
    data: { orderId, status },
    priority: 'high',
    actionUrl: '/orders/123',
    actionText: 'View Order',
});

// Send email notification
await notificationService.sendEmailNotification(userId, 'order_status_update', {
    orderId: '123',
    status: 'processing',
    trackingNumber: 'TRK123',
    message: 'Order is being processed',
});
```

### Admin Action Methods

```javascript
// Order status update by admin
await notificationService.notifyAdminOrderStatusUpdate(
    userId,
    orderData,
    status,
    message,
    adminName
);

// Group buy status update by admin
await notificationService.notifyAdminGroupBuyStatusUpdate(
    userId,
    productName,
    groupBuyId,
    newStatus,
    oldStatus,
    adminName,
    fulfillmentData
);

// Order cancellation by admin
await notificationService.notifyAdminOrderCancellation(
    userId,
    orderData,
    reason,
    adminName
);

// Refund processed by admin
await notificationService.notifyAdminRefundProcessed(
    userId,
    amount,
    reason,
    orderId,
    adminName
);

// Delivery scheduled by admin
await notificationService.notifyAdminDeliveryScheduled(
    userId,
    orderData,
    deliveryInfo,
    adminName
);

// Order ready for pickup
await notificationService.notifyAdminPickupReady(
    userId,
    orderData,
    pickupLocation,
    adminName
);
```

## Frontend Integration

### Notification Context

The frontend uses a notification context to manage notifications:

```javascript
import { useNotification } from '../contexts/NotificationContext';

const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotification();
```

### WebSocket Events

The system emits these WebSocket events:

```javascript
// New notification
socket.on('notification:new', (data) => {
    // Handle new notification
});

// Notification read
socket.on('notification:read', (data) => {
    // Update read status
});

// All notifications read
socket.on('notification:all_read', () => {
    // Clear unread count
});
```

## Testing

### Test Email Configuration

```javascript
// Test email service
const emailService = require('./services/emailService');
const result = await emailService.sendEmail(
    'test@example.com',
    'Test Email',
    '<h1>Test</h1><p>This is a test email</p>'
);
console.log(result);
```

### Test Notification

```javascript
// Test notification service
const notificationService = require('./services/notificationService');
await notificationService.notifyAdminOrderStatusUpdate(
    userId,
    { orderId: '123', trackingNumber: 'TRK123' },
    'processing',
    'Order is being processed',
    'Admin User'
);
```

## Troubleshooting

### Email Not Sending

1. **Check environment variables**: Ensure all email variables are set
2. **Verify SMTP credentials**: Test with a simple email client
3. **Check logs**: Look for email service errors in logs
4. **Gmail specific**: Ensure 2FA is enabled and app password is used

### Notifications Not Appearing

1. **Check WebSocket connection**: Verify socket.io connection
2. **Check user authentication**: Ensure user is logged in
3. **Check notification service**: Verify service is properly initialized
4. **Check database**: Ensure notifications are being saved

### Performance Issues

1. **Email queuing**: Consider implementing email queuing for high volume
2. **Database indexing**: Ensure proper indexes on notification collections
3. **WebSocket optimization**: Limit concurrent connections if needed

## Security Considerations

1. **Email validation**: Always validate email addresses before sending
2. **Rate limiting**: Implement rate limiting for notification endpoints
3. **Admin authentication**: Ensure all admin actions require proper authentication
4. **Data sanitization**: Sanitize all user input in notifications
5. **Email content**: Avoid sending sensitive information via email

## Future Enhancements

1. **Push notifications**: Add mobile push notification support
2. **SMS notifications**: Integrate SMS service for critical notifications
3. **Notification preferences**: Allow users to customize notification settings
4. **Bulk notifications**: Support for bulk notification sending
5. **Analytics**: Track notification engagement and effectiveness
6. **Templates**: Allow custom email templates per organization
7. **Scheduling**: Support for scheduled notifications
8. **A/B testing**: Test different notification formats and timing

## API Endpoints Summary

### Admin Notification Endpoints

| Method | Endpoint                                              | Description                               |
| ------ | ----------------------------------------------------- | ----------------------------------------- |
| PUT    | `/api/orders/admin/:trackingNumber/status`            | Update order status with notification     |
| POST   | `/api/admin/orders/:trackingNumber/cancel`            | Cancel order with notification            |
| POST   | `/api/admin/orders/:trackingNumber/refund`            | Process refund with notification          |
| POST   | `/api/admin/orders/:trackingNumber/schedule-delivery` | Schedule delivery with notification       |
| POST   | `/api/admin/orders/:trackingNumber/ready-pickup`      | Mark ready for pickup with notification   |
| PUT    | `/api/groupbuy/admin/:id/status`                      | Update group buy status with notification |

### User Notification Endpoints

| Method | Endpoint                           | Description                    |
| ------ | ---------------------------------- | ------------------------------ |
| GET    | `/api/notifications`               | Get user notifications         |
| GET    | `/api/notifications/unread-count`  | Get unread count               |
| PATCH  | `/api/notifications/:id/read`      | Mark notification as read      |
| PATCH  | `/api/notifications/mark-all-read` | Mark all notifications as read |
| DELETE | `/api/notifications/:id`           | Delete notification            |
| DELETE | `/api/notifications/clear-all`     | Clear all notifications        |
