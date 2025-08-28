#!/usr/bin/env node

/**
 * Simple Test Script for Notifications (No Email)
 * 
 * This script tests the notification system without email service
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import notificationService from './services/notificationService.js';
import User from './models/User.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

class SimpleNotificationTester {
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

  async testNotificationCreation(user) {
    logger.info('\n🧪 Testing Notification Creation...');
    
    try {
      const notification = await notificationService.createNotification({
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
      });
      
      if (notification) {
        logger.info('✅ Test notification created successfully');
        logger.info(`📝 Notification ID: ${notification._id}`);
        logger.info(`📝 Title: ${notification.title}`);
        logger.info(`📝 Message: ${notification.message}`);
        this.testResults.push('Notification Creation: PASS');
        return notification;
      } else {
        throw new Error('Notification creation returned null');
      }
    } catch (error) {
      logger.error('❌ Notification creation test error:', error);
      this.testResults.push('Notification Creation: FAIL');
      this.errors.push(`Notification creation error: ${error.message}`);
      return null;
    }
  }

  async testAdminGroupBuyStatusNotification(user) {
    logger.info('\n🧪 Testing Admin Group Buy Status Notification...');
    
    try {
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
        logger.info('✅ Admin group buy status notification sent successfully');
        this.testResults.push('Admin Group Buy Status Notification: PASS');
      } else {
        throw new Error('Admin group buy status notification returned null');
      }
    } catch (error) {
      logger.error('❌ Admin group buy status notification error:', error);
      this.testResults.push('Admin Group Buy Status Notification: FAIL');
      this.errors.push(`Admin group buy status notification error: ${error.message}`);
    }
  }

  async getUserNotifications(user) {
    logger.info('\n📋 Fetching User Notifications...');
    
    try {
      const result = await notificationService.getUserNotifications(user._id, {
        page: 1,
        limit: 10
      });
      
      logger.info(`✅ Found ${result.notifications.length} notifications`);
      logger.info(`📊 Total notifications: ${result.pagination.total}`);
      
      // Display recent notifications
      if (result.notifications.length > 0) {
        logger.info('\n📝 Recent Notifications:');
        result.notifications.slice(0, 3).forEach((notification, index) => {
          logger.info(`${index + 1}. ${notification.title}: ${notification.message}`);
        });
      }
      
      this.testResults.push('Get User Notifications: PASS');
    } catch (error) {
      logger.error('❌ Get user notifications error:', error);
      this.testResults.push('Get User Notifications: FAIL');
      this.errors.push(`Get user notifications error: ${error.message}`);
    }
  }

  printTestResults() {
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 SIMPLE NOTIFICATION TEST RESULTS');
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
      logger.info('🎉 All tests passed! Notifications are working correctly.');
    } else {
      logger.info('⚠️ Some tests failed. Please check the errors above.');
    }
    logger.info('='.repeat(60));
  }

  async runAllTests() {
    logger.info('🚀 Starting Simple Notification Tests...');
    
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
      await this.testNotificationCreation(user);
      await this.testAdminGroupBuyStatusNotification(user);
      await this.getUserNotifications(user);
      
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
  const tester = new SimpleNotificationTester();
  tester.runAllTests().catch(error => {
    logger.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

export default SimpleNotificationTester;



