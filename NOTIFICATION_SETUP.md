# 🚀 Quick Setup Guide - Notification System

## Prerequisites

1. Node.js 18+ installed
2. MongoDB running
3. Grup backend project set up

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

This will install `nodemailer` and other required dependencies.

## Step 2: Configure Email Service

### Option A: Gmail (Recommended for testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
3. **Add to .env file**:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
EMAIL_FROM_NAME=Grup Team
```

### Option B: Other SMTP Providers

```env
# Outlook/Hotmail
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password

# Yahoo
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASS=your-app-password

# Custom SMTP
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
```

## Step 3: Test the System

Run the notification system test:

```bash
npm run test:notifications
```

This will:
- Test email service configuration
- Create test notifications
- Test admin action notifications
- Generate email templates
- Verify the entire system

## Step 4: Verify Admin Endpoints

The following admin endpoints now send notifications:

### Order Management
- `PUT /api/orders/admin/:trackingNumber/status` - Update order status
- `POST /api/admin/orders/:trackingNumber/cancel` - Cancel order
- `POST /api/admin/orders/:trackingNumber/refund` - Process refund
- `POST /api/admin/orders/:trackingNumber/schedule-delivery` - Schedule delivery
- `POST /api/admin/orders/:trackingNumber/ready-pickup` - Mark ready for pickup

### Group Buy Management
- `PUT /api/groupbuy/admin/:id/status` - Update group buy status

## Step 5: Test Admin Actions

### Example: Update Order Status

```bash
curl -X PUT http://localhost:5000/api/orders/admin/TRK123/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "status": "processing",
    "message": "Order is now being processed",
    "notifyCustomer": true
  }'
```

### Example: Cancel Order

```bash
curl -X POST http://localhost:5000/api/admin/orders/TRK123/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "reason": "Out of stock"
  }'
```

## Step 6: Monitor Notifications

### Check User Notifications

```bash
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer USER_TOKEN"
```

### Check Unread Count

```bash
curl -X GET http://localhost:5000/api/notifications/unread-count \
  -H "Authorization: Bearer USER_TOKEN"
```

## Troubleshooting

### Email Not Sending

1. **Check environment variables**:
   ```bash
   echo $EMAIL_HOST
   echo $EMAIL_USER
   echo $EMAIL_PASS
   ```

2. **Test SMTP connection**:
   ```bash
   npm run test:notifications
   ```

3. **Check logs** for email service errors

### Notifications Not Appearing

1. **Check WebSocket connection** in browser console
2. **Verify user authentication**
3. **Check database** for notification records
4. **Run notification test** to verify system

### Common Issues

#### Gmail "Less secure app access"
- Use App Passwords instead of regular password
- Enable 2-Factor Authentication first

#### SMTP Connection Timeout
- Check firewall settings
- Verify port 587 is open
- Try port 465 with SSL

#### Authentication Failed
- Double-check email and password
- For Gmail, ensure App Password is used
- Check if account has security restrictions

## Production Deployment

### Environment Variables

Set these in your production environment:

```env
NODE_ENV=production
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASS=your-production-app-password
EMAIL_FROM_NAME=Grup Team
```

### Email Service Recommendations

For production, consider:
- **SendGrid**: Reliable email delivery service
- **Mailgun**: Good for transactional emails
- **AWS SES**: Cost-effective for high volume
- **Postmark**: Excellent deliverability

### Monitoring

Monitor these metrics:
- Email delivery success rate
- Notification creation rate
- WebSocket connection stability
- Database performance

## Support

If you encounter issues:

1. Check the logs: `tail -f logs/app.log`
2. Run the test: `npm run test:notifications`
3. Verify configuration in `.env`
4. Check the full documentation: `NOTIFICATION_SYSTEM.md`

## Next Steps

After setup, you can:

1. **Customize email templates** in `services/emailService.js`
2. **Add new notification types** in `services/notificationService.js`
3. **Create admin dashboard** for notification management
4. **Implement notification preferences** for users
5. **Add SMS notifications** for critical updates


