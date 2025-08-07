import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { 
  getActiveGroupBuys, 
  getUserGroupBuys,
  getManualReviewGroupBuys,
  updateGroupBuyStatus,
  getGroupBuyStats,
  getGroupBuyByProduct
} from '../controllers/groupBuyController.js';

const router = express.Router();

// Get all active group buys
router.get('/active', getActiveGroupBuys);

// Get group buy for specific product
router.get('/product/:productId', getGroupBuyByProduct);

// Get user's group buy participations
router.get('/my-groups', verifyToken, getUserGroupBuys);

// Get group buy statistics
router.get('/stats', getGroupBuyStats);

// Admin routes
router.get('/manual-review', verifyToken, getManualReviewGroupBuys);
router.patch('/:groupBuyId/status', verifyToken, updateGroupBuyStatus);

export default router;
