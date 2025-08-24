#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

async function testGroupBuyNotification() {
  console.log('🚀 Testing Group Buy Status Notification...');
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/GRUP';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Import required models and services
    const notificationService = (await import('./services/notificationService.js')).default;
    const User = (await import('./models/User.js')).default;
    const GroupBuy = (await import('./models/GroupBuy.js')).default;
    
    console.log('✅ All services imported successfully');
    
    // Find or create a test user
    let user = await User.findOne({});
    if (!user) {
      console.log('📝 Creating test user...');
      user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpassword123',
        referralCode: 'TEST123'
      });
      await user.save();
      console.log('✅ Test user created');
    } else {
      console.log(`✅ Found existing user: ${user.email}`);
    }
    
    // Test the admin group buy status notification
    console.log('\n🧪 Testing Admin Group Buy Status Notification...');
    
    const result = await notificationService.notifyAdminGroupBuyStatusUpdate(
      user._id,
      'Test Product',
      '507f1f77bcf86cd799439012',
      'ready_for_pickup',
      'processing',
      'Test Admin',
      { deliveryMethod: 'pickup', pickupLocation: 'Test Location' }
    );
    
    if (result) {
      console.log('✅ Admin group buy status notification sent successfully');
      console.log(`📝 Notification ID: ${result._id}`);
      console.log(`📝 Title: ${result.title}`);
      console.log(`📝 Message: ${result.message}`);
    } else {
      console.log('❌ Failed to send admin group buy status notification');
    }
    
    // Test regular group buy status notification
    console.log('\n🧪 Testing Regular Group Buy Status Notification...');
    
    const regularResult = await notificationService.createNotification({
      userId: user._id,
      type: 'success',
      category: 'group_buy',
      title: 'Group Buy Ready for Pickup',
      message: 'Your order is ready for pickup!',
      data: { 
        productName: 'Test Product',
        groupBuyId: '507f1f77bcf86cd799439012',
        newStatus: 'ready_for_pickup',
        oldStatus: 'processing'
      },
      priority: 'medium',
      actionUrl: '/account/orders',
      actionText: 'View Orders'
    });
    
    if (regularResult) {
      console.log('✅ Regular group buy status notification created successfully');
      console.log(`📝 Notification ID: ${regularResult._id}`);
      console.log(`📝 Title: ${regularResult.title}`);
      console.log(`📝 Message: ${regularResult.message}`);
    } else {
      console.log('❌ Failed to create regular group buy status notification');
    }
    
    // Get user notifications to verify they were created
    console.log('\n📋 Fetching User Notifications...');
    
    const notifications = await notificationService.getUserNotifications(user._id, {
      page: 1,
      limit: 10
    });
    
    console.log(`✅ Found ${notifications.notifications.length} notifications for user`);
    console.log(`📊 Total notifications: ${notifications.pagination.total}`);
    
    if (notifications.notifications.length > 0) {
      console.log('\n📝 Recent Notifications:');
      notifications.notifications.slice(0, 3).forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.title}: ${notification.message}`);
      });
    }
    
    console.log('\n🎉 Group Buy Notification Test Completed Successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

testGroupBuyNotification();
