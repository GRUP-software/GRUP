#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

async function checkOrders() {
  console.log('🔍 Checking Order records in database...');
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/GRUP';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Import Order model
    const Order = (await import('./models/order.js')).default;
    
    // Get all orders
    const orders = await Order.find({}).select('_id trackingNumber currentStatus createdAt').limit(10);
    
    console.log(`📊 Found ${orders.length} orders in database`);
    
    if (orders.length > 0) {
      console.log('\n📝 Recent Orders:');
      orders.forEach((order, index) => {
        console.log(`${index + 1}. ID: ${order._id}`);
        console.log(`   Tracking: ${order.trackingNumber || 'N/A'}`);
        console.log(`   Status: ${order.currentStatus || 'N/A'}`);
        console.log(`   Created: ${order.createdAt}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No orders found in database');
    }
    
    // Check if the problematic order ID exists
    const problematicOrderId = '68aa447ccf4302510af88174';
    const problematicOrder = await Order.findById(problematicOrderId);
    
    if (problematicOrder) {
      console.log(`✅ Problematic order ${problematicOrderId} exists`);
      console.log('📝 Details:', {
        trackingNumber: problematicOrder.trackingNumber,
        currentStatus: problematicOrder.currentStatus,
        totalAmount: problematicOrder.totalAmount
      });
    } else {
      console.log(`❌ Problematic order ${problematicOrderId} does not exist`);
      console.log('💡 This explains why AdminJS is having issues with it');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

checkOrders();



