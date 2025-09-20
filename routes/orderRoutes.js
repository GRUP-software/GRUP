import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    getUserOrders,
    getOrderProgress,
    trackOrderByNumber,
    lookupOrderForStaff,
    getOrdersForAdmin,
    updateOrderStatus,
    handleFulfillmentChoice,
} from '../controllers/orderController.js';
import Order from '../models/order.js';

const router = express.Router();

// Customer routes
router.get('/my-orders', verifyToken, getUserOrders);
router.get('/progress/:orderId', verifyToken, getOrderProgress);

// Public tracking route (no auth required)
router.get('/track/:trackingNumber', trackOrderByNumber);

// Staff routes (requires auth)
router.get('/lookup/:trackingNumber', verifyToken, lookupOrderForStaff);

// Admin routes
router.get('/x9k2m5p8/all', verifyToken, getOrdersForAdmin);
router.patch('/x9k2m5p8/:trackingNumber/status', verifyToken, updateOrderStatus);

// React Admin compatibility endpoints
router.get(
    '/x9k2m5p8/api/resources/Order/records/:id',
    verifyToken,
    async (req, res) => {
        try {
            const order = await Order.findById(req.params.id)
                .populate('user', 'name email')
                .populate('items.product', 'title images')
                .populate('items.groupbuyId', 'status progressPercentage');

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            res.json(order);
        } catch (error) {
            console.error('Get Order by ID Error:', error);
            res.status(500).json({
                message: 'Error fetching order',
                error: error.message,
            });
        }
    }
);

router.post(
    '/x9k2m5p8/api/resources/Order/records/:id/edit',
    verifyToken,
    async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Remove fields that shouldn't be updated directly
            delete updateData._id;
            delete updateData.__v;
            delete updateData.createdAt;
            delete updateData.updatedAt;

            const order = await Order.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true,
            })
                .populate('user', 'name email')
                .populate('items.product', 'title images')
                .populate('items.groupbuyId', 'status progressPercentage');

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }

            res.json(order);
        } catch (error) {
            console.error('Update Order Error:', error);
            res.status(500).json({
                message: 'Error updating order',
                error: error.message,
            });
        }
    }
);

// WhatsApp integration
router.post('/fulfillment-choice', handleFulfillmentChoice);

export default router;
