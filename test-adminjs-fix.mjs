#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/order.js';

// Load environment variables
dotenv.config();

async function testAdminJSFix() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/GRUP');
    console.log('✅ Connected to MongoDB');

    // Test finding an order
    const order = await Order.findById('68acdccc6e29a37545fdd8e8');
    
    if (order) {
      console.log('✅ Order found:', {
        id: order._id,
        trackingNumber: order.trackingNumber,
        currentStatus: order.currentStatus,
        totalAmount: order.totalAmount
      });

      // Test toJSON method
      try {
        const orderJson = order.toJSON();
        console.log('✅ toJSON method works:', {
          trackingNumber: orderJson.trackingNumber,
          currentStatus: orderJson.currentStatus,
          totalAmount: orderJson.totalAmount
        });
      } catch (error) {
        console.error('❌ toJSON method failed:', error.message);
      }

      // Test updating the order
      try {
        order.currentStatus = 'processing';
        await order.save();
        console.log('✅ Order update successful');
      } catch (error) {
        console.error('❌ Order update failed:', error.message);
      }

    } else {
      console.log('❌ Order not found');
    }

    // Test finding multiple orders
    const orders = await Order.find().limit(5);
    console.log(`✅ Found ${orders.length} orders`);

    if (orders.length > 0) {
      console.log('Sample order data:', {
        id: orders[0]._id,
        trackingNumber: orders[0].trackingNumber,
        currentStatus: orders[0].currentStatus,
        totalAmount: orders[0].totalAmount
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testAdminJSFix();


