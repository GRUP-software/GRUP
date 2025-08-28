#!/usr/bin/env node

/**
 * Fix Order Records Script
 * 
 * This script checks and fixes any problematic Order records that might be causing AdminJS errors
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from './models/order.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

class OrderRecordFixer {
  constructor() {
    this.fixedCount = 0;
    this.errorCount = 0;
    this.problematicRecords = [];
  }

  async connectToDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/grup';
      await mongoose.connect(mongoUri);
      logger.info('✅ Connected to database');
      return true;
    } catch (error) {
      logger.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async disconnectFromDatabase() {
    try {
      await mongoose.disconnect();
      logger.info('✅ Disconnected from database');
    } catch (error) {
      logger.error('❌ Database disconnection error:', error);
    }
  }

  async checkOrderRecord(order) {
    try {
      // Test if the order can be converted to JSON
      const orderJson = order.toJSON();
      
      // Check for required fields
      if (!orderJson.trackingNumber) {
        logger.warn(`⚠️ Order ${order._id} missing trackingNumber`);
        return { valid: false, issue: 'missing_tracking_number' };
      }

      if (!orderJson.user) {
        logger.warn(`⚠️ Order ${order._id} missing user reference`);
        return { valid: false, issue: 'missing_user' };
      }

      if (!orderJson.items || !Array.isArray(orderJson.items)) {
        logger.warn(`⚠️ Order ${order._id} missing or invalid items array`);
        return { valid: false, issue: 'invalid_items' };
      }

      if (!orderJson.currentStatus) {
        logger.warn(`⚠️ Order ${order._id} missing currentStatus`);
        return { valid: false, issue: 'missing_status' };
      }

      return { valid: true };
    } catch (error) {
      logger.error(`❌ Error checking order ${order._id}:`, error.message);
      return { valid: false, issue: 'tojson_error', error: error.message };
    }
  }

  async fixOrderRecord(order, issue) {
    try {
      switch (issue) {
        case 'missing_tracking_number':
          if (!order.trackingNumber) {
            order.trackingNumber = `FIXED_${order._id.toString().slice(-8)}`;
            logger.info(`🔧 Fixed tracking number for order ${order._id}`);
          }
          break;

        case 'missing_status':
          if (!order.currentStatus) {
            order.currentStatus = 'groups_forming';
            logger.info(`🔧 Fixed currentStatus for order ${order._id}`);
          }
          break;

        case 'invalid_items':
          if (!order.items || !Array.isArray(order.items)) {
            order.items = [];
            logger.info(`🔧 Fixed items array for order ${order._id}`);
          }
          break;

        case 'tojson_error':
          // Try to fix common issues
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
          logger.info(`🔧 Applied general fixes for order ${order._id}`);
          break;
      }

      await order.save();
      this.fixedCount++;
      logger.info(`✅ Successfully fixed order ${order._id}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to fix order ${order._id}:`, error.message);
      this.errorCount++;
      return false;
    }
  }

  async scanAndFixOrders() {
    logger.info('🔍 Scanning all Order records...');
    
    try {
      const orders = await Order.find({});
      logger.info(`📊 Found ${orders.length} total orders`);
      
      for (const order of orders) {
        const checkResult = await this.checkOrderRecord(order);
        
        if (!checkResult.valid) {
          this.problematicRecords.push({
            id: order._id,
            issue: checkResult.issue,
            error: checkResult.error
          });
          
          logger.warn(`⚠️ Problematic order found: ${order._id} - Issue: ${checkResult.issue}`);
          
          // Try to fix the order
          await this.fixOrderRecord(order, checkResult.issue);
        }
      }
      
      logger.info(`✅ Scan completed. Found ${this.problematicRecords.length} problematic records`);
      logger.info(`🔧 Fixed ${this.fixedCount} records`);
      logger.info(`❌ Failed to fix ${this.errorCount} records`);
      
    } catch (error) {
      logger.error('❌ Error scanning orders:', error);
    }
  }

  async testSpecificOrder(orderId) {
    logger.info(`🧪 Testing specific order: ${orderId}`);
    
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        logger.error(`❌ Order ${orderId} not found`);
        return;
      }
      
      const checkResult = await this.checkOrderRecord(order);
      if (checkResult.valid) {
        logger.info(`✅ Order ${orderId} is valid`);
      } else {
        logger.warn(`⚠️ Order ${orderId} has issues: ${checkResult.issue}`);
        await this.fixOrderRecord(order, checkResult.issue);
      }
      
    } catch (error) {
      logger.error(`❌ Error testing order ${orderId}:`, error);
    }
  }

  printSummary() {
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 ORDER RECORD FIX SUMMARY');
    logger.info('='.repeat(60));
    
    logger.info(`🔍 Total problematic records found: ${this.problematicRecords.length}`);
    logger.info(`🔧 Successfully fixed: ${this.fixedCount}`);
    logger.info(`❌ Failed to fix: ${this.errorCount}`);
    
    if (this.problematicRecords.length > 0) {
      logger.info('\n📝 Problematic Records:');
      this.problematicRecords.forEach((record, index) => {
        logger.info(`${index + 1}. Order ID: ${record.id} - Issue: ${record.issue}`);
        if (record.error) {
          logger.info(`   Error: ${record.error}`);
        }
      });
    }
    
    logger.info('='.repeat(60));
  }

  async run() {
    logger.info('🚀 Starting Order Record Fix Process...');
    
    // Connect to database
    const dbConnected = await this.connectToDatabase();
    if (!dbConnected) {
      logger.error('❌ Cannot proceed without database connection');
      return;
    }
    
    try {
      // Check if a specific order ID was provided
      const specificOrderId = process.argv[2];
      
      if (specificOrderId) {
        await this.testSpecificOrder(specificOrderId);
      } else {
        await this.scanAndFixOrders();
      }
      
      // Print summary
      this.printSummary();
      
    } catch (error) {
      logger.error('❌ Error during fix process:', error);
    } finally {
      // Disconnect from database
      await this.disconnectFromDatabase();
    }
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new OrderRecordFixer();
  fixer.run().catch(error => {
    logger.error('❌ Script error:', error);
    process.exit(1);
  });
}

export default OrderRecordFixer;



