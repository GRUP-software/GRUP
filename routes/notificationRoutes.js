import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Get user notifications with pagination and filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, category, read, sortBy, sortOrder } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      category: category || null,
      read: read === 'true' ? true : read === 'false' ? false : null,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc'
    };

    const result = await notificationService.getUserNotifications(userId, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await notificationService.markAsRead(userId, notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: { notification }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);
    
    res.json({
      success: true,
      data: { updatedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Clear all notifications for user (must come before /:notificationId route)
router.delete('/clear-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await notificationService.clearAllNotifications(userId);
    
    res.json({
      success: true,
      message: 'All notifications cleared successfully',
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear all notifications'
    });
  }
});

// Delete notification
router.delete('/:notificationId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await notificationService.deleteNotification(userId, notificationId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    });
  }
});

// Health check endpoint for notifications
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notification system is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      getNotifications: 'GET /',
      getUnreadCount: 'GET /unread-count',
      markAsRead: 'PATCH /:id/read',
      markAllAsRead: 'PATCH /mark-all-read',
      deleteNotification: 'DELETE /:id'
    }
  });
});

// Test endpoint to create a sample notification
router.post('/test', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const testNotification = await notificationService.createNotification({
      userId,
      type: 'info',
      category: 'system',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working!',
      data: { test: true, timestamp: new Date().toISOString() },
      priority: 'medium'
    });
    
    res.json({
      success: true,
      message: 'Test notification created successfully',
      data: { notification: testNotification }
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test notification'
    });
  }
});

export default router;
