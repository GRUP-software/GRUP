#!/usr/bin/env node

/**
 * Test Script for Notification System
 * 
 * This script tests the notification system including:
 * - Email service configuration
 * - Notification creation
 * - Admin action notifications
 * - Email templates
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import notificationService from './services/notificationService.js';
import emailService from './services/emailService.js';
import User from './models/User.js';
import Order from './models/order.js';
import GroupBuy from './models/GroupBuy.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

// Test configuration
const TEST_CONFIG = {
  testUserEmail: 'test@example.com',
  testAdminName: 'Test Admin',
  testOrderId: '507f1f77bcf86cd799439011',
  testGroupBuyId: '507f1f77bcf86cd799439012',
  testTrackingNumber: 'TRK123456',
  testProductName: 'Test Product',
  testAmount: 5000,
  testReason: 'Test reason for admin action'
};

class NotificationSystemTester {
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
      let user = await User.findOne({ email: TEST_CONFIG.testUserEmail });
      
      if (!user) {
        logger.info('📝 Creating test user...');
        user = new User({
          name: 'Test User',
          email: TEST_CONFIG.testUserEmail,
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

  async testEmailService() {
    logger.info('\n🧪 Testing Email Service...');
    
    try {
      // Test email service configuration
      const isConfigured = emailService.isConfigured;
      logger.info(`📧 Email service configured: ${isConfigured}`);
      
      if (isConfigured) {
        // Test sending a simple email
        const result = await emailService.sendEmail(
          TEST_CONFIG.testUserEmail,
          'Test Email - Notification System',
          '<h1>Test Email</h1><p>This is a test email from the notification system.</p>'
        );
        
        if (result.success) {
          logger.info('✅ Test email sent successfully');
          this.testResults.push('Email Service: PASS');
        } else {
          logger.error('❌ Test email failed:', result.error);
          this.testResults.push('Email Service: FAIL');
          this.errors.push(`Email sending failed: ${result.error}`);
        }
      } else {
        logger.warn('⚠️ Email service not configured - skipping email tests');
        this.testResults.push('Email Service: SKIP (not configured)');
      }
    } catch (error) {
      logger.error('❌ Email service test error:', error);
      this.testResults.push('Email Service: FAIL');
      this.errors.push(`Email service error: ${error.message}`);
    }
  }

  async testNotificationCreation(user) {
    logger.info('\n🧪 Testing Notification Creation...');
    
    try {
      const notification = await notificationService.createNotification({
        userId: user._id,
        type: 'info',
        category: 'system',
        title: 'Test Notification',
        message: 'This is a test notification from the notification system',
        data: { test: true, timestamp: new Date() },
        priority: 'medium'
      });
      
      if (notification) {
        logger.info('✅ Test notification created successfully');
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

  async testAdminOrderStatusNotification(user) {
    logger.info('\n🧪 Testing Admin Order Status Notification...');
    
    try {
      const orderData = {
        orderId: TEST_CONFIG.testOrderId,
        trackingNumber: TEST_CONFIG.testTrackingNumber
      };
      
      await notificationService.notifyAdminOrderStatusUpdate(
        user._id,
        orderData,
        'processing',
        'Order is being processed by admin',
        TEST_CONFIG.testAdminName
      );
      
      logger.info('✅ Admin order status notification sent');
      this.testResults.push('Admin Order Status Notification: PASS');
    } catch (error) {
      logger.error('❌ Admin order status notification error:', error);
      this.testResults.push('Admin Order Status Notification: FAIL');
      this.errors.push(`Admin order status notification error: ${error.message}`);
    }
  }

  async testAdminGroupBuyStatusNotification(user) {
    logger.info('\n🧪 Testing Admin Group Buy Status Notification...');
    
    try {
      await notificationService.notifyAdminGroupBuyStatusUpdate(
        user._id,
        TEST_CONFIG.testProductName,
        TEST_CONFIG.testGroupBuyId,
        'processing',
        'active',
        TEST_CONFIG.testAdminName,
        { deliveryMethod: 'pickup', pickupLocation: 'Test Location' }
      );
      
      logger.info('✅ Admin group buy status notification sent');
      this.testResults.push('Admin Group Buy Status Notification: PASS');
    } catch (error) {
      logger.error('❌ Admin group buy status notification error:', error);
      this.testResults.push('Admin Group Buy Status Notification: FAIL');
      this.errors.push(`Admin group buy status notification error: ${error.message}`);
    }
  }

  async testAdminOrderCancellationNotification(user) {
    logger.info('\n🧪 Testing Admin Order Cancellation Notification...');
    
    try {
      const orderData = {
        orderId: TEST_CONFIG.testOrderId,
        trackingNumber: TEST_CONFIG.testTrackingNumber
      };
      
      await notificationService.notifyAdminOrderCancellation(
        user._id,
        orderData,
        TEST_CONFIG.testReason,
        TEST_CONFIG.testAdminName
      );
      
      logger.info('✅ Admin order cancellation notification sent');
      this.testResults.push('Admin Order Cancellation Notification: PASS');
    } catch (error) {
      logger.error('❌ Admin order cancellation notification error:', error);
      this.testResults.push('Admin Order Cancellation Notification: FAIL');
      this.errors.push(`Admin order cancellation notification error: ${error.message}`);
    }
  }

  async testAdminRefundNotification(user) {
    logger.info('\n🧪 Testing Admin Refund Notification...');
    
    try {
      await notificationService.notifyAdminRefundProcessed(
        user._id,
        TEST_CONFIG.testAmount,
        TEST_CONFIG.testReason,
        TEST_CONFIG.testOrderId,
        TEST_CONFIG.testAdminName
      );
      
      logger.info('✅ Admin refund notification sent');
      this.testResults.push('Admin Refund Notification: PASS');
    } catch (error) {
      logger.error('❌ Admin refund notification error:', error);
      this.testResults.push('Admin Refund Notification: FAIL');
      this.errors.push(`Admin refund notification error: ${error.message}`);
    }
  }

  async testEmailTemplates() {
    logger.info('\n🧪 Testing Email Templates...');
    
    try {
      // Test order status email template
      const orderStatusEmail = emailService.generateOrderStatusEmail({
        orderId: TEST_CONFIG.testOrderId,
        trackingNumber: TEST_CONFIG.testTrackingNumber,
        status: 'processing',
        message: 'Order is being processed',
        customerName: 'Test User',
        totalAmount: TEST_CONFIG.testAmount
      });
      
      if (orderStatusEmail && orderStatusEmail.includes('Order Status Update')) {
        logger.info('✅ Order status email template generated');
        this.testResults.push('Order Status Email Template: PASS');
      } else {
        throw new Error('Order status email template generation failed');
      }
      
      // Test group buy status email template
      const groupBuyStatusEmail = emailService.generateGroupBuyStatusEmail({
        productName: TEST_CONFIG.testProductName,
        groupBuyId: TEST_CONFIG.testGroupBuyId,
        newStatus: 'processing',
        oldStatus: 'active',
        customerName: 'Test User',
        progressPercentage: 75
      });
      
      if (groupBuyStatusEmail && groupBuyStatusEmail.includes('Group Buy Status Update')) {
        logger.info('✅ Group buy status email template generated');
        this.testResults.push('Group Buy Status Email Template: PASS');
      } else {
        throw new Error('Group buy status email template generation failed');
      }
      
      // Test admin action email template
      const adminActionEmail = emailService.generateAdminActionNotificationEmail({
        actionType: 'order_status_update',
        actionDetails: {
          title: 'Order Status Updated',
          description: 'Order is being processed',
          orderId: TEST_CONFIG.testOrderId,
          trackingNumber: TEST_CONFIG.testTrackingNumber
        },
        customerName: 'Test User',
        adminName: TEST_CONFIG.testAdminName,
        timestamp: new Date()
      });
      
      if (adminActionEmail && adminActionEmail.includes('Admin Action')) {
        logger.info('✅ Admin action email template generated');
        this.testResults.push('Admin Action Email Template: PASS');
      } else {
        throw new Error('Admin action email template generation failed');
      }
      
    } catch (error) {
      logger.error('❌ Email template test error:', error);
      this.testResults.push('Email Templates: FAIL');
      this.errors.push(`Email template error: ${error.message}`);
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
    logger.info('📊 NOTIFICATION SYSTEM TEST RESULTS');
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
    logger.info('🚀 Starting Notification System Tests...');
    
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
      await this.testEmailService();
      await this.testNotificationCreation(user);
      await this.testAdminOrderStatusNotification(user);
      await this.testAdminGroupBuyStatusNotification(user);
      await this.testAdminOrderCancellationNotification(user);
      await this.testAdminRefundNotification(user);
      await this.testEmailTemplates();
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
  const tester = new NotificationSystemTester();
  tester.runAllTests().catch(error => {
    logger.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

export default NotificationSystemTester;



