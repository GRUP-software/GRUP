# 🌤️ Cloudinary Integration Setup Guide

## Overview
This guide explains how to set up Cloudinary for image uploads in the Grup backend with environment-specific folders.

## 🚀 Quick Setup

### 1. Environment Variables
Create a `.env` file in the backend directory with the following variables:

```env
# Environment
NODE_ENV=development

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dafkhnw7p
CLOUDINARY_API_KEY=946915641663984
CLOUDINARY_API_SECRET=MU6_2U6tpzbJ-VbnqfQ-_OEQeWc
CLOUDINARY_FOLDER=grup

# Other configurations...
MONGODB_URI=mongodb://localhost:27017/grup
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
```

### 2. Environment-Specific Folders
The system automatically creates environment-specific folders in Cloudinary:

- **Development**: `grup/development/`
- **Testing**: `grup/testing/`
- **Staging**: `grup/staging/`
- **Production**: `grup/production/`

## 📁 Folder Structure

```
Cloudinary Account (dafkhnw7p)
├── grup/
│   ├── development/     # Development images
│   ├── testing/         # Testing images
│   ├── staging/         # Staging images
│   └── production/      # Production images
```

## 🔧 API Endpoints

### Upload Single Image
```http
POST /api/upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- image: <file>
```

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "image": {
      "public_id": "grup/development/image_1234567890_abc123",
      "url": "https://res.cloudinary.com/dafkhnw7p/image/upload/...",
      "width": 1920,
      "height": 1080,
      "format": "jpg",
      "bytes": 245760
    },
    "originalName": "product-image.jpg",
    "size": 245760
  }
}
```

### Upload Multiple Images
```http
POST /api/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- images: <file1>
- images: <file2>
- images: <file3>
```

### Delete Image
```http
DELETE /api/upload/:publicId
Authorization: Bearer <token>
```

### Get Image URL with Transformations
```http
GET /api/upload/url/:publicId?width=300&height=200&quality=80&crop=fill
Authorization: Bearer <token>
```

### Get Cloudinary Info
```http
GET /api/upload/info
Authorization: Bearer <token>
```

## 🛠️ Usage Examples

### Frontend Upload Example
```javascript
// Upload single image
const formData = new FormData();
formData.append('image', file);

const response = await fetch('/api/upload/single', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log('Uploaded image URL:', result.data.image.url);
```

### Backend Service Usage
```javascript
import cloudinaryService from './services/cloudinaryService.js';

// Upload image
const result = await cloudinaryService.uploadImage(fileBuffer, 'custom-public-id');

// Delete image
await cloudinaryService.deleteImage('public-id');

// Get transformed URL
const url = cloudinaryService.getImageUrl('public-id', {
  width: 300,
  height: 200,
  crop: 'fill',
  quality: 'auto'
});
```

## 🔄 Migration from Local Storage

### Current Local Uploads
The existing `upload.js` middleware still works for local storage:
- Files saved to `uploads/` directory
- Served via `/uploads/` endpoint

### New Cloudinary Uploads
Use the new `cloudinaryUpload.js` middleware:
- Files uploaded to Cloudinary
- URLs returned for immediate use
- Automatic optimization and transformations

## 🎯 Benefits

1. **Environment Separation**: Development and production images are completely separate
2. **Automatic Optimization**: Cloudinary optimizes images automatically
3. **CDN Delivery**: Fast global image delivery
4. **Transformations**: On-the-fly image resizing and cropping
5. **No Local Storage**: No need to manage local file storage
6. **Scalability**: Handles high traffic and large files

## 🔒 Security

- All upload endpoints require authentication
- File type validation (images only)
- File size limits (10MB per file)
- Maximum 10 files per request
- Environment-specific folders prevent cross-contamination

## 🧪 Testing

Run the test script to verify configuration:
```bash
node test-cloudinary.js
```

## 📝 Environment Switching

To switch environments, change the `NODE_ENV` variable:

```bash
# Development
NODE_ENV=development

# Testing
NODE_ENV=testing

# Staging
NODE_ENV=staging

# Production
NODE_ENV=production
```

## 🚨 Important Notes

1. **Backup**: Always backup existing local images before migration
2. **Environment Variables**: Never commit `.env` files to version control
3. **API Limits**: Monitor Cloudinary API usage and limits
4. **Costs**: Cloudinary has usage-based pricing
5. **Migration**: Plan migration strategy for existing images

## 🔗 Useful Links

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Dashboard](https://cloudinary.com/console)
- [Upload Presets](https://cloudinary.com/documentation/upload_presets)
- [Image Transformations](https://cloudinary.com/documentation/image_transformations)



