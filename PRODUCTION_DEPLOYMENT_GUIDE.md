# 🚀 Production Deployment Guide

## 📋 Environment Variables for Production

Set these environment variables in your production backend:

```env
# Production Environment Variables
NODE_ENV=production

# Server
PORT=5000

# Database (Update with your production MongoDB URI)
MONGODB_URI=your-production-mongodb-uri

# JWT (Use a strong, unique secret)
JWT_SECRET=your-super-secure-production-jwt-secret

# Session
SESSION_SECRET=your-session-secret-key-for-production

# URLs
FRONTEND_URL=https://grup.com.ng
BACKEND_URL=https://api.grup.com.ng

# Cloudinary (Same credentials, different folder)
CLOUDINARY_CLOUD_NAME=dafkhnw7p
CLOUDINARY_API_KEY=946915641663984
CLOUDINARY_API_SECRET=MU6_2U6tpzbJ-VbnqfQ-_OEQeWc
CLOUDINARY_FOLDER=grup

# Flutterwave (Use production keys)
FLUTTERWAVE_SECRET_KEY=FLWSECK_your_production_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_your_production_key
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_your_encryption_key

# Socket.IO
SOCKET_CORS_ORIGIN=https://grup.com.ng

# Logging
LOG_LEVEL=error

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-production-email
EMAIL_PASS=your-production-email-password
EMAIL_FROM_NAME=Grup Team
```

## 🔧 Deployment Steps

### 1. Backend Deployment

1. Deploy the backend code to your production server
2. Set the environment variables above
3. Restart your backend service

### 2. Frontend Deployment

1. Deploy the frontend code to Netlify
2. The redirects will automatically handle product URLs

### 3. Testing

1. Test with Facebook Debugger: https://developers.facebook.com/tools/debug/
2. Test with Twitter Card Validator: https://cards-dev.twitter.com/validator
3. Test WhatsApp sharing with a product link

## 📱 Expected Results

After deployment, when users share product links:

- **URL**: `https://grup.com.ng/product/yellow-garri`
- **Image**: Shows the actual yellow-garri product image
- **Title**: "Grup - Yellow Garri"
- **Description**: Product description
- **Redirect**: Users get redirected to the React app

## 🛠️ Troubleshooting

If meta tags aren't working:

1. Check that the backend API is accessible at `https://api.grup.com.ng/api/product-meta/{slug}`
2. Verify that Netlify redirects are working
3. Clear browser cache and test again
4. Check browser console for any JavaScript errors

## 📞 Support

If you encounter any issues, check:

1. Backend logs for errors
2. Browser console for JavaScript errors
3. Network tab for failed API calls
4. Social media debugger tools for specific errors
