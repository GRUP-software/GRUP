#!/usr/bin/env node

/**
 * Notification-Only Test Script
 * 
 * This script tests the notification system without email service
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

class NotificationOnlyTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
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

  async findOrCreateTestUser() {
    try {
      let user = await User.findOne({ email: 'test@example.com' });
      
      if (!user) {
        logger.info('📝 Creating test user...');
        user = new User({
          name: 'Test User',
          email: 'test@example.com',
          password: 'testpassword123',
          referralCode: 'TEST123'
        });
        await user.save();
        logger.info('✅ Test user created');
      } else {
        logger.info('✅ Test user found');
      }
      
      return user;
    } catch (error) {
      logger.error('❌ Error with test user:', error);
      throw error;
    }
  }

  async testDirectNotificationCreation(user) {
    logger.info('\n🧪 Testing Direct Notification Creation...');
    
    try {
      // Import Notification model directly
      const Notification = (await import('./models/Notification.js')).default;
      
      const notificationData = {
        userId: user._id,
        type: 'success',
        category: 'group_buy_status',
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
      };
      
      const notification = await Notification.createNotification(notificationData);
      
      if (notification) {
        logger.info('✅ Direct notification created successfully');
        logger.info(`📝 Notification ID: ${notification._id}`);
        logger.info(`📝 Title: ${notification.title}`);
        logger.info(`📝 Message: ${notification.message}`);
        this.testResults.push('Direct Notification Creation: PASS');
        return notification;
      } else {
        throw new Error('Direct notification creation returned null');
      }
    } catch (error) {
      logger.error('❌ Direct notification creation test error:', error);
      this.testResults.push('Direct Notification Creation: FAIL');
      this.errors.push(`Direct notification creation error: ${error.message}`);
      return null;
    }
  }

  async testNotificationRetrieval(user) {
    logger.info('\n📋 Testing Notification Retrieval...');
    
    try {
      const Notification = (await import('./models/Notification.js')).default;
      
      const notifications = await Notification.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(10);
      
      logger.info(`✅ Found ${notifications.length} notifications for user`);
      
      if (notifications.length > 0) {
        logger.info('\n📝 Recent Notifications:');
        notifications.slice(0, 3).forEach((notification, index) => {
          logger.info(`${index + 1}. ${notification.title}: ${notification.message}`);
        });
      }
      
      this.testResults.push('Notification Retrieval: PASS');
    } catch (error) {
      logger.error('❌ Notification retrieval error:', error);
      this.testResults.push('Notification Retrieval: FAIL');
      this.errors.push(`Notification retrieval error: ${error.message}`);
    }
  }

  printTestResults() {
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 NOTIFICATION-ONLY TEST RESULTS');
    logger.info('='.repeat(60));
    
    this.testResults.forEach(result => {
      const [test, status] = result.split(': ');
      const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
      logger.info(`${emoji} ${test}: ${status}`);
    });
    
    if (this.errors.length > 0) {
      logger.info('\n❌ ERRORS:');
      this.errors.forEach((error, index) => {
        logger.info(`${index + 1}. ${error}`);
      });
    }
    
    const passedTests = this.testResults.filter(r => r.includes('PASS')).length;
    const totalTests = this.testResults.length;
    
    logger.info('\n' + '='.repeat(60));
    logger.info(`🎯 SUMMARY: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      logger.info('🎉 All tests passed! Notification system is working correctly.');
    } else {
      logger.info('⚠️ Some tests failed. Please check the errors above.');
    }
    logger.info('='.repeat(60));
  }

  async runAllTests() {
    logger.info('🚀 Starting Notification-Only Tests...');
    
    // Connect to database
    const dbConnected = await this.connectToDatabase();
    if (!dbConnected) {
      logger.error('❌ Cannot proceed without database connection');
      return;
    }
    
    try {
      // Find or create test user
      const user = await this.findOrCreateTestUser();
      
      // Run all tests
      await this.testDirectNotificationCreation(user);
      await this.testNotificationRetrieval(user);
      
      // Print results
      this.printTestResults();
      
    } catch (error) {
      logger.error('❌ Test execution error:', error);
    } finally {
      // Disconnect from database
      await this.disconnectFromDatabase();
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new NotificationOnlyTester();
  tester.runAllTests().catch(error => {
    logger.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

export default NotificationOnlyTester;

