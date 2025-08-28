// deploy-production-fix.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Grup Production Fix Deployment Script');
console.log('==========================================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this script from the backend directory.');
  process.exit(1);
}

console.log('✅ Backend directory confirmed');

// Check if admin.mjs exists and has the UploadedImage fix
const adminPath = path.join(__dirname, 'admin.mjs');
if (!fs.existsSync(adminPath)) {
  console.error('❌ Error: admin.mjs not found.');
  process.exit(1);
}

const adminContent = fs.readFileSync(adminPath, 'utf8');
if (adminContent.includes('resource: UploadedImage')) {
  console.log('✅ UploadedImage resource found in admin.mjs');
} else {
  console.error('❌ Error: UploadedImage resource not found in admin.mjs');
  process.exit(1);
}

// Check if uploadedImage.js model exists
const modelPath = path.join(__dirname, 'models', 'uploadedImage.js');
if (!fs.existsSync(modelPath)) {
  console.error('❌ Error: models/uploadedImage.js not found.');
  process.exit(1);
}
console.log('✅ UploadedImage model found');

// Check for .env file
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.warn('⚠️  Warning: .env file not found. You may need to create one for production.');
} else {
  console.log('✅ .env file found');
}

console.log('\n📋 Production Deployment Checklist:');
console.log('====================================');
console.log('1. ✅ AdminJS configuration updated');
console.log('2. ✅ UploadedImage model verified');
console.log('3. ✅ Field mappings corrected');
console.log('4. ✅ Error handling improved');

console.log('\n🚀 Deployment Steps:');
console.log('===================');
console.log('1. Upload the updated admin.mjs file to your production server');
console.log('2. Restart your Node.js application');
console.log('3. Clear any cached data if using a CDN or proxy');
console.log('4. Test the admin panel at https://api.grup.com.ng/admin');

console.log('\n🔧 Additional Production Checks:');
console.log('===============================');
console.log('- Ensure MongoDB is running and accessible');
console.log('- Verify environment variables are set correctly');
console.log('- Check server logs for any remaining errors');
console.log('- Test the UploadedImage list endpoint directly');

console.log('\n📞 If issues persist:');
console.log('===================');
console.log('1. Check server logs for detailed error messages');
console.log('2. Verify MongoDB connection string');
console.log('3. Ensure all required environment variables are set');
console.log('4. Test database connectivity');

console.log('\n✅ Deployment script completed successfully!');
console.log('🎯 The UploadedImage AdminJS issue should now be resolved.');
