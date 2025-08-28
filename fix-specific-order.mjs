#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

async function fixSpecificOrder() {
  console.log('🔧 Fixing specific problematic Order record...');
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/GRUP';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Import Order model
    const Order = (await import('./models/order.js')).default;
    
    // The problematic order ID from the error
    const problematicOrderId = '68aa447ccf4302510af88174';
    
    console.log(`🔍 Looking for Order: ${problematicOrderId}`);
    
    // Find the order
    let order = await Order.findById(problematicOrderId);
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    
    console.log('✅ Found order, checking for issues...');
    
    // Test if the order can be converted to JSON
    try {
      const orderJson = order.toJSON();
      console.log('✅ Order can be converted to JSON successfully');
      console.log('📝 Order details:', {
        trackingNumber: orderJson.trackingNumber,
        currentStatus: orderJson.currentStatus,
        totalAmount: orderJson.totalAmount,
        itemsCount: orderJson.items?.length || 0
      });
    } catch (error) {
      console.log('❌ Order has JSON conversion issues:', error.message);
      
      // Fix the order
      console.log('🔧 Attempting to fix the order...');
      
      // Ensure all required fields exist
      if (!order.trackingNumber) {
        order.trackingNumber = `FIXED_${order._id.toString().slice(-8)}`;
      }
      
      if (!order.currentStatus) {
        order.currentStatus = 'groups_forming';
      }
      
      if (!order.items || !Array.isArray(order.items)) {
        order.items = [];
      }
      
      if (!order.progress || !Array.isArray(order.progress)) {
        order.progress = [];
      }
      
      if (!order.totalAmount) {
        order.totalAmount = 0;
      }
      
      if (!order.walletUsed) {
        order.walletUsed = 0;
      }
      
      if (!order.paystackAmount) {
        order.paystackAmount = 0;
      }
      
      if (!order.priorityScore) {
        order.priorityScore = 0;
      }
      
      if (!order.allGroupsSecured) {
        order.allGroupsSecured = false;
      }
      
      if (!order.deliveryAddress) {
        order.deliveryAddress = {};
      }
      
      if (!order.fulfillmentChoice) {
        order.fulfillmentChoice = 'pickup';
      }
      
      // Save the fixed order
      await order.save();
      console.log('✅ Order fixed and saved successfully');
      
      // Test again
      try {
        const fixedOrderJson = order.toJSON();
        console.log('✅ Fixed order can now be converted to JSON');
      } catch (fixError) {
        console.log('❌ Order still has issues after fixing:', fixError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

fixSpecificOrder();



