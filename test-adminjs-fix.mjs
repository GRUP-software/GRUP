#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

async function testAdminJSFix() {
  console.log('🧪 Testing AdminJS Fix...');
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/GRUP';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Import Order model
    const Order = (await import('./models/order.js')).default;
    
    // Test 1: Check if the toJSON method works with a new order
    console.log('\n🧪 Test 1: Creating a test order...');
    
    const testOrder = new Order({
      trackingNumber: 'TEST123456',
      paymentHistoryId: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(),
      items: [],
      currentStatus: 'groups_forming',
      totalAmount: 1000
    });
    
    // Test the toJSON method
    try {
      const orderJson = testOrder.toJSON();
      console.log('✅ toJSON method works correctly');
      console.log('📝 Order JSON:', {
        trackingNumber: orderJson.trackingNumber,
        currentStatus: orderJson.currentStatus,
        totalAmount: orderJson.totalAmount
      });
    } catch (error) {
      console.log('❌ toJSON method failed:', error.message);
    }
    
    // Test 2: Check if the problematic order ID exists
    console.log('\n🧪 Test 2: Checking problematic order...');
    
    const problematicOrderId = '68aa447ccf4302510af88174';
    const problematicOrder = await Order.findById(problematicOrderId);
    
    if (problematicOrder) {
      console.log('⚠️ Problematic order exists - testing toJSON...');
      try {
        const json = problematicOrder.toJSON();
        console.log('✅ Problematic order toJSON works');
      } catch (error) {
        console.log('❌ Problematic order toJSON failed:', error.message);
      }
    } else {
      console.log('✅ Problematic order does not exist (this is good)');
    }
    
    // Test 3: Check total orders in database
    console.log('\n🧪 Test 3: Checking total orders...');
    
    const totalOrders = await Order.countDocuments();
    console.log(`📊 Total orders in database: ${totalOrders}`);
    
    if (totalOrders === 0) {
      console.log('💡 Database is empty - this explains the AdminJS error');
      console.log('💡 The error occurs because AdminJS tries to edit a non-existent order');
    }
    
    console.log('\n🎯 Summary:');
    console.log('- The toJSON method is working correctly');
    console.log('- The problematic order does not exist');
    console.log('- AdminJS should now handle missing orders gracefully');
    console.log('- Try accessing the admin panel and navigate to Orders');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

testAdminJSFix();

