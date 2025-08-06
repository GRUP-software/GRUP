import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getCart, addToCart, removeFromCart, updateCartQuantity } from '../controllers/cartController.js';

const router = express.Router();

router.get('/', verifyToken, getCart);
router.post('/', verifyToken, addToCart);
router.patch('/update-quantity', verifyToken, updateCartQuantity);
router.delete('/:itemId', verifyToken, removeFromCart);

export default router;
