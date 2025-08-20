import GroupBuy from '../models/GroupBuy.js';
import Product from '../models/Product.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

class GroupBuyMonitoringService {
  constructor() {
    this.isRunning = false;
  }

  // Start monitoring group buys
  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.monitorGroupBuys();
    
    // Run every 5 minutes
    setInterval(() => {
      if (this.isRunning) {
        this.monitorGroupBuys();
      }
    }, 5 * 60 * 1000);
    
    logger.info('Group buy monitoring service started');
  }

  // Stop monitoring
  stopMonitoring() {
    this.isRunning = false;
    logger.info('Group buy monitoring service stopped');
  }

  // Main monitoring function
  async monitorGroupBuys() {
    try {
      const now = new Date();
      
      // Get all active group buys
      const activeGroupBuys = await GroupBuy.find({
        status: 'active',
        expiresAt: { $gt: now }
      }).populate('productId', 'title');

      for (const groupBuy of activeGroupBuys) {
        await this.checkGroupBuyStatus(groupBuy, now);
      }

      // Check expired group buys
      const expiredGroupBuys = await GroupBuy.find({
        status: 'active',
        expiresAt: { $lte: now }
      }).populate('productId', 'title');

      for (const groupBuy of expiredGroupBuys) {
        await this.handleExpiredGroupBuy(groupBuy);
      }

    } catch (error) {
      logger.error('Error in group buy monitoring:', error);
    }
  }

  // Check individual group buy status
  async checkGroupBuyStatus(groupBuy, now) {
    try {
      const timeLeft = groupBuy.expiresAt - now;
      const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
      const progressPercentage = groupBuy.getProgressPercentage();

      // Notify when group buy is expiring soon (6 hours, 2 hours, 1 hour)
      if (hoursLeft <= 6 && hoursLeft > 5 && !groupBuy._expiringNotified) {
        await this.notifyExpiringSoon(groupBuy, hoursLeft, progressPercentage);
        groupBuy._expiringNotified = true;
      } else if (hoursLeft <= 2 && hoursLeft > 1 && !groupBuy._expiringSoonNotified) {
        await this.notifyExpiringSoon(groupBuy, hoursLeft, progressPercentage);
        groupBuy._expiringSoonNotified = true;
      } else if (hoursLeft <= 1 && hoursLeft > 0 && !groupBuy._expiringVerySoonNotified) {
        await this.notifyExpiringSoon(groupBuy, hoursLeft, progressPercentage);
        groupBuy._expiringVerySoonNotified = true;
      }

      // Check if group buy reached MVU
      if (groupBuy.unitsSold >= groupBuy.minimumViableUnits && !groupBuy._mvuReachedNotified) {
        await this.notifyMVUReached(groupBuy);
        groupBuy._mvuReachedNotified = true;
      }

    } catch (error) {
      logger.error(`Error checking group buy ${groupBuy._id}:`, error);
    }
  }

  // Handle expired group buy
  async handleExpiredGroupBuy(groupBuy) {
    try {
      const progressPercentage = groupBuy.getProgressPercentage();
      const productName = groupBuy.productId?.title || 'Product';

      if (groupBuy.unitsSold >= groupBuy.minimumViableUnits) {
        // Group buy was successful
        groupBuy.status = 'successful';
        await groupBuy.save();

        await this.notifyExpiredSuccessful(groupBuy, productName);
      } else {
        // Group buy failed - move to manual review
        groupBuy.prepareForManualReview();
        await groupBuy.save();

        await this.notifyExpiredFailed(groupBuy, productName, progressPercentage);
      }

    } catch (error) {
      logger.error(`Error handling expired group buy ${groupBuy._id}:`, error);
    }
  }

  // Notification methods
  async notifyExpiringSoon(groupBuy, hoursLeft, progressPercentage) {
    const productName = groupBuy.productId?.title || 'Product';
    
    for (const participant of groupBuy.participants) {
      try {
        await notificationService.notifyGroupBuyExpiring(
          participant.userId,
          productName,
          groupBuy._id,
          hoursLeft,
          Math.round(progressPercentage)
        );
      } catch (error) {
        logger.error(`Failed to send expiring notification to user ${participant.userId}:`, error);
      }
    }
  }

  async notifyMVUReached(groupBuy) {
    const productName = groupBuy.productId?.title || 'Product';
    
    for (const participant of groupBuy.participants) {
      try {
        await notificationService.notifyGroupBuySecured(
          participant.userId,
          productName,
          groupBuy._id
        );
      } catch (error) {
        logger.error(`Failed to send MVU reached notification to user ${participant.userId}:`, error);
      }
    }
  }

  async notifyExpiredSuccessful(groupBuy, productName) {
    const message = `Group buy completed successfully! Your order is being processed.`;
    
    for (const participant of groupBuy.participants) {
      try {
        await notificationService.notifyGroupBuyExpired(
          participant.userId,
          productName,
          groupBuy._id,
          'successful',
          message
        );
      } catch (error) {
        logger.error(`Failed to send expired successful notification to user ${participant.userId}:`, error);
      }
    }
  }

  async notifyExpiredFailed(groupBuy, productName, progressPercentage) {
    const message = `Group buy expired with ${Math.round(progressPercentage)}% completion. Under admin review.`;
    
    for (const participant of groupBuy.participants) {
      try {
        await notificationService.notifyGroupBuyExpired(
          participant.userId,
          productName,
          groupBuy._id,
          'failed',
          message
        );
        
        // Also send manual review notification
        await notificationService.notifyGroupBuyManualReview(
          participant.userId,
          productName,
          groupBuy._id,
          Math.round(progressPercentage)
        );
      } catch (error) {
        logger.error(`Failed to send expired failed notification to user ${participant.userId}:`, error);
      }
    }
  }

  // Manual method to check specific group buy
  async checkSpecificGroupBuy(groupBuyId) {
    try {
      const groupBuy = await GroupBuy.findById(groupBuyId).populate('productId', 'title');
      if (!groupBuy) {
        throw new Error('Group buy not found');
      }

      await this.checkGroupBuyStatus(groupBuy, new Date());
      
      if (groupBuy.isExpired()) {
        await this.handleExpiredGroupBuy(groupBuy);
      }

      return groupBuy;
    } catch (error) {
      logger.error(`Error checking specific group buy ${groupBuyId}:`, error);
      throw error;
    }
  }
}

const groupBuyMonitoringService = new GroupBuyMonitoringService();
export default groupBuyMonitoringService;


