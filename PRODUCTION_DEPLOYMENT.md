# 🚀 Production Deployment Guide - Cloudinary Image Uploads

## 📋 Overview

This guide explains how to deploy your Grup application to production with Cloudinary image uploads properly configured for environment separation.

## 🌍 Environment Separation

Your Cloudinary setup automatically separates images by environment:

- **Development:** `grup/development/`
- **Testing:** `grup/testing/`
- **Staging:** `grup/staging/`
- **Production:** `grup/production/`

## 🔧 Production Setup

### Step 1: Environment Variables

Create a production `.env` file with these settings:

```env
# Environment
NODE_ENV=production

# Server
PORT=5000

# Database (Use your production MongoDB URI)
MONGODB_URI=mongodb://your-production-db-uri

# JWT (Use a strong, unique secret)
JWT_SECRET=your-super-secure-production-jwt-secret

# Cloudinary (Same credentials, different folder)
CLOUDINARY_CLOUD_NAME=dafkhnw7p
CLOUDINARY_API_KEY=946915641663984
CLOUDINARY_API_SECRET=MU6_2U6tpzbJ-VbnqfQ-_OEQeWc
CLOUDINARY_FOLDER=grup

# Paystack (Use production keys)
PAYSTACK_SECRET_KEY=sk_live_your_production_key
PAYSTACK_PUBLIC_KEY=pk_live_your_production_key

# Frontend URL (Your production domain)
SOCKET_CORS_ORIGIN=https://your-domain.com

# Logging
LOG_LEVEL=error
```

### Step 2: Deploy Your Application

1. **Upload your code** to your production server
2. **Install dependencies:**
   ```bash
   npm install --production
   ```
3. **Set environment variables** (use your hosting platform's method)
4. **Start the application:**
   ```bash
   npm start
   ```

### Step 3: Update Frontend URLs

Update your frontend to point to your production backend:

```javascript
// In your frontend configuration
const API_BASE_URL = 'https://your-backend-domain.com/api';
```

## 📤 Uploading Images in Production

### Method 1: Admin Panel (Recommended)

1. **Visit:** `https://your-domain.com/admin-upload.html`
2. **Login** with admin credentials
3. **Upload images** - they'll automatically go to `grup/production/` folder
4. **View in admin panel** under "Uploaded Image" section

### Method 2: API Endpoints

Use these production endpoints:

```bash
# Single image upload
POST https://your-domain.com/api/upload/admin/single
Authorization: Bearer <admin-token>

# Multiple images upload
POST https://your-domain.com/api/upload/admin/multiple
Authorization: Bearer <admin-token>

# Get Cloudinary info
GET https://your-domain.com/api/upload/info
Authorization: Bearer <admin-token>
```

### Method 3: Direct Cloudinary Upload

You can also upload directly to Cloudinary using their dashboard:

1. **Go to:** https://cloudinary.com/console
2. **Navigate to:** Media Library
3. **Upload to:** `grup/production/` folder
4. **Copy URLs** for use in your admin panel

## 🔍 Verifying Production Setup

### Check Environment Configuration

Visit: `https://your-domain.com/api/upload/info`

Expected response:
```json
{
  "success": true,
  "data": {
    "cloud_name": "dafkhnw7p",
    "folder": "grup/production",
    "environment": "production"
  }
}
```

### Test Image Upload

1. **Upload a test image** through the admin panel
2. **Check Cloudinary dashboard** - image should appear in `grup/production/`
3. **Check admin panel** - image should appear in "Uploaded Image" section

## 🛡️ Security Considerations

### Production Security Checklist

- [ ] **Strong JWT Secret:** Use a long, random string
- [ ] **HTTPS Only:** All production URLs should use HTTPS
- [ ] **Environment Variables:** Never commit secrets to code
- [ ] **CORS Configuration:** Restrict to your production domain
- [ ] **Rate Limiting:** Consider adding rate limits to upload endpoints
- [ ] **File Validation:** Ensure only image files are uploaded

### Recommended Security Headers

Add these headers to your production server:

```javascript
// Security headers
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## 📊 Monitoring and Maintenance

### Cloudinary Dashboard

- **Monitor usage:** Check Cloudinary dashboard for storage/bandwidth
- **Review images:** Regularly clean up unused images
- **Check transformations:** Monitor image optimization performance

### Application Logs

Monitor these logs in production:

```bash
# Check for upload errors
grep "upload" /var/log/your-app.log

# Check for authentication issues
grep "401\|403" /var/log/your-app.log

# Monitor Cloudinary API calls
grep "cloudinary" /var/log/your-app.log
```

## 🔄 Migration from Development

### Moving Images Between Environments

If you need to move images from development to production:

1. **Export from Cloudinary:**
   ```bash
   # Use Cloudinary CLI or API to download images
   cloudinary download grup/development/ --folder grup/production/
   ```

2. **Update Database Records:**
   ```javascript
   // Update UploadedImage records with new URLs
   db.uploadedimages.updateMany(
     { url: /development/ },
     { $set: { url: { $replaceAll: { input: "$url", find: "development", replacement: "production" } } } }
   );
   ```

## 🆘 Troubleshooting

### Common Production Issues

**Issue:** Images not uploading
- **Check:** Cloudinary credentials in environment variables
- **Check:** Network connectivity to Cloudinary
- **Check:** File size limits (10MB max)

**Issue:** 401 Unauthorized errors
- **Check:** JWT token validity
- **Check:** Admin authentication
- **Check:** CORS configuration

**Issue:** Images not appearing in admin panel
- **Check:** Database connection
- **Check:** UploadedImage model creation
- **Check:** Admin panel permissions

### Support Resources

- **Cloudinary Documentation:** https://cloudinary.com/documentation
- **MongoDB Atlas:** https://docs.atlas.mongodb.com/
- **Your Hosting Platform:** Check their deployment guides

## ✅ Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Cloudinary credentials verified
- [ ] Admin panel accessible
- [ ] Image uploads working
- [ ] HTTPS configured
- [ ] Security headers set
- [ ] Monitoring configured
- [ ] Backup strategy in place

---

**🎯 Your production setup is now ready! Images will automatically be stored in the `grup/production/` folder and will be completely separate from your development images.**



