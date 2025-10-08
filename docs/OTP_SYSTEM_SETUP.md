# OTP System Setup Guide

## 🎯 **Overview**

The OTP (One-Time Password) system is now fully set up and ready for use. It supports:
- **Signup verification** (when you enable it)
- **Password reset** via OTP
- **Email verification** for existing users

## 📧 **Email Service Configuration**

### **Current Status**
- ✅ OTP system is fully implemented
- ✅ Email templates are ready
- ⏳ Email service is **disabled** until you add credentials
- ✅ System works with in-app notifications for now

### **To Enable Email Service**

Add these environment variables to your `.env` file:

```bash
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com                    # Your SMTP host
EMAIL_PORT=587                               # SMTP port (587 for TLS, 465 for SSL)
EMAIL_USER=your-email@gmail.com             # Your email address
EMAIL_PASS=your-app-password                 # Your email password or app password
EMAIL_FROM_NAME=Grup Team                   # Display name for emails
```

### **Popular Email Providers**

#### **Gmail**
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password  # Use App Password, not regular password
```

#### **Outlook/Hotmail**
```bash
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASS=your-password
```

#### **Custom SMTP**
```bash
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
```

## 🔧 **API Endpoints**

### **Signup OTP (Currently Disabled)**
```bash
# Send OTP for signup
POST /api/otp/signup/send
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123",
  "secretRecoveryKey": "mysecretkey123",
  "phone": "+2348012345678",
  "referralCode": "optional"
}

# Verify OTP for signup
POST /api/otp/signup/verify
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### **Password Reset OTP (Active)**
```bash
# Send OTP for password reset
POST /api/otp/password-reset/send
{
  "email": "user@example.com"
}

# Verify OTP for password reset
POST /api/otp/password-reset/verify
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### **Email Verification OTP (Active)**
```bash
# Send OTP for email verification (requires auth token)
POST /api/otp/email-verification/send
Authorization: Bearer YOUR_TOKEN
{
  "email": "user@example.com"
}

# Verify OTP for email verification
POST /api/otp/email-verification/verify
{
  "email": "user@example.com",
  "otp": "123456"
}
```

## 🛡️ **Security Features**

### **Rate Limiting**
- **OTP Requests**: 5 requests per 15 minutes per IP
- **OTP Verification**: 10 attempts per 15 minutes per IP

### **OTP Security**
- **6-digit numeric codes**
- **10-minute expiration**
- **Maximum 5 verification attempts**
- **Auto-cleanup of expired OTPs**
- **One-time use only**

### **Email Templates**
- **Professional HTML templates**
- **Security warnings included**
- **Mobile-responsive design**
- **Branded with Grup styling**

## 📱 **Current Behavior**

### **Without Email Service**
- OTPs are generated and stored
- Email sending is logged but not sent
- Users can still verify OTPs (for testing)
- System works with in-app notifications

### **With Email Service**
- OTPs are sent via email
- Professional email templates
- Full email delivery tracking
- Enhanced user experience

## 🧪 **Testing the System**

### **Test Password Reset OTP**
```bash
# 1. Send OTP
curl -X POST http://localhost:5000/api/otp/password-reset/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Check logs for OTP code
# 3. Verify OTP
curl -X POST http://localhost:5000/api/otp/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

### **Test Email Verification OTP**
```bash
# 1. Login first to get token
# 2. Send OTP
curl -X POST http://localhost:5000/api/otp/email-verification/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 3. Verify OTP
curl -X POST http://localhost:5000/api/otp/email-verification/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

## 🔄 **Integration with Existing System**

### **Current Signup Process**
- ✅ **Still works as before** (no OTP required)
- ✅ Users can signup normally
- ✅ Recovery system remains active
- ⏳ OTP signup is ready but disabled

### **When You Enable Email Service**
1. Add email credentials to `.env`
2. Restart the server
3. Email service will automatically activate
4. OTP emails will be sent
5. Users can use OTP verification

### **To Enable OTP Signup Later**
1. Update frontend to use OTP signup flow
2. Modify signup endpoint to require OTP verification
3. Update user registration process

## 📊 **Monitoring & Debugging**

### **Check OTP Status**
```bash
GET /api/otp/status/{email}/{type}
Authorization: Bearer YOUR_TOKEN
```

### **Clean Up Expired OTPs**
```bash
POST /api/otp/cleanup
Authorization: Bearer YOUR_TOKEN
```

### **Server Logs**
- OTP generation: `📧 Signup OTP sent to email: 123456`
- Email status: `✅ Email service configured successfully`
- Rate limiting: `Too many OTP requests`

## 🚀 **Next Steps**

1. **Get email service credentials** from your partner
2. **Add credentials to `.env` file**
3. **Restart the server**
4. **Test email delivery**
5. **Enable OTP signup** (when ready)

## ⚠️ **Important Notes**

- **Current signup works without OTP** (as requested)
- **Recovery system remains fully functional**
- **OTP system is ready but not enforced**
- **Email service activates automatically** when credentials are added
- **No breaking changes** to existing functionality

The system is production-ready and will seamlessly activate email functionality once you add the credentials!

