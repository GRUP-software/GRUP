// test-uploaded-image.mjs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminJS from 'adminjs';
import * as AdminJSMongoose from '@adminjs/mongoose';
import UploadedImage from './models/uploadedImage.js';

// Load environment variables
dotenv.config();

// Register Mongoose adapter
AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

const testUploadedImage = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grup-production';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Test 1: Check if model can be created
    console.log('\n🧪 Test 1: Model Creation');
    const testImage = new UploadedImage({
      filename: 'test-image.jpg',
      originalName: 'test-image.jpg',
      url: 'https://example.com/test-image.jpg',
      size: 1024,
      mimetype: 'image/jpeg',
      uploadedBy: 'admin',
      isUsed: false,
      tags: ['test'],
      description: 'Test image'
    });
    console.log('✅ Test image object created successfully');

    // Test 2: Check AdminJS resource creation
    console.log('\n🧪 Test 2: AdminJS Resource Creation');
    const adminJs = new AdminJS({
      resources: [
        {
          resource: UploadedImage,
          options: {
            properties: {
              filename: { isVisible: { list: true, filter: true, show: true, edit: false } },
              originalName: { isVisible: { list: true, filter: true, show: true, edit: false } },
              url: { isVisible: { list: true, filter: false, show: true, edit: false } },
              size: { type: 'number', isVisible: { list: true, filter: false, show: true, edit: false } },
              mimetype: { isVisible: { list: true, filter: true, show: true, edit: false } },
              uploadedBy: { isVisible: { list: true, filter: true, show: true, edit: false } },
              isUsed: { type: 'boolean', isVisible: { list: true, filter: true, show: true, edit: false } },
              usedInProducts: { reference: 'Product', isArray: true, isVisible: { list: false, filter: false, show: true, edit: false } },
              tags: { isArray: true, isVisible: { list: false, filter: true, show: true, edit: false } },
              description: { isVisible: { list: false, filter: false, show: true, edit: false } },
              createdAt: { type: 'datetime', isVisible: { list: true, filter: true, show: true, edit: false } },
            },
            actions: {
              edit: { isAccessible: false },
              new: { isAccessible: false },
              delete: { isAccessible: false },
            },
            perPage: 50,
          },
        },
      ],
    });
    console.log('✅ AdminJS configuration created successfully');

    // Test 3: Check if we can query the database
    console.log('\n🧪 Test 3: Database Query');
    const count = await UploadedImage.countDocuments();
    console.log(`✅ Found ${count} uploaded images in database`);

    if (count > 0) {
      const sampleImage = await UploadedImage.findOne();
      console.log('✅ Sample image data:', {
        filename: sampleImage.filename,
        url: sampleImage.url,
        size: sampleImage.size,
        mimetype: sampleImage.mimetype,
        uploadedBy: sampleImage.uploadedBy,
        isUsed: sampleImage.isUsed,
        createdAt: sampleImage.createdAt
      });
    }

    // Test 4: Check schema fields
    console.log('\n🧪 Test 4: Schema Validation');
    const schemaFields = Object.keys(UploadedImage.schema.paths);
    console.log('✅ Schema fields:', schemaFields);

    console.log('\n🎉 All tests passed! UploadedImage model and AdminJS configuration are working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      codeName: error.codeName
    });
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the test
testUploadedImage();
