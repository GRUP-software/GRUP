#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

async function quickTest() {
  console.log('🚀 Starting quick test...');
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grup';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Test notification service
    const notificationService = (await import('./services/notificationService.js')).default;
    console.log('✅ Notification service imported');
    
    // Test creating a simple notification
    const Notification = (await import('./models/Notification.js')).default;
    console.log('✅ Notification model imported');
    
    // Find a user to test with
    const User = (await import('./models/User.js')).default;
    const user = await User.findOne({});
    
    if (user) {
      console.log(`✅ Found user: ${user.email}`);
      
      // Create a test notification
      const notification = await Notification.create({
        userId: user._id,
        type: 'success',
        category: 'test',
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: 'medium'
      });
      
      console.log(`✅ Created notification: ${notification._id}`);
      console.log(`📝 Title: ${notification.title}`);
      console.log(`📝 Message: ${notification.message}`);
      
    } else {
      console.log('⚠️ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

quickTest();


