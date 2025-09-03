import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    getCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
} from '../controllers/cartController.js';

const router = express.Router();

// Get user's cart
router.get('/', verifyToken, getCart);

// Add item to cart
router.post('/add', verifyToken, addToCart);

// Update item quantity
router.patch('/update-quantity', verifyToken, updateCartQuantity);

// Remove item from cart
router.delete('/remove/:productId', verifyToken, removeFromCart);

// Clear entire cart
router.delete('/clear', verifyToken, clearCart);

export default router;
