import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getCart, addToCart, removeFromCart } from '../controllers/cartController.js';

const router = express.Router();

router.get('/', verifyToken, getCart);
router.post('/', verifyToken, addToCart);
router.delete('/:itemId', verifyToken, removeFromCart);

export default router;
