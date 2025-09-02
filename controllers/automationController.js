import Product from '../models/Product.js';
import Order from '../models/order.js';
import GroupBuy from '../models/GroupBuy.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import logger from '../utils/logger.js';

// Smart pricing automation
export const updateDynamicPricing = async () => {
    try {
        const products = await Product.find({ stock: { $gt: 0 } });

        for (const product of products) {
            // Get demand metrics
            const recentOrders = await Order.countDocuments({
                'items.product': product._id,
                createdAt: {
                    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
                paymentStatus: 'paid',
            });

            const activeGroups = await GroupBuy.countDocuments({
                productId: product._id,
                status: 'forming',
            });

            // Calculate demand score
            const demandScore = recentOrders * 0.6 + activeGroups * 0.4;

            // Adjust pricing based on demand and stock
            let priceMultiplier = 1;

            if (product.stock < product.lowStockThreshold) {
                priceMultiplier += 0.1; // Increase price by 10% for low stock
            }

            if (demandScore > 5) {
                priceMultiplier += 0.05; // Increase price by 5% for high demand
            } else if (demandScore < 1) {
                priceMultiplier -= 0.05; // Decrease price by 5% for low demand
            }

            const newPrice = Math.round(product.basePrice * priceMultiplier);

            if (newPrice !== product.price) {
                product.price = newPrice;
                await product.save();

                logger.info(
                    `Dynamic pricing updated for ${product.title}: ₦${product.basePrice} → ₦${newPrice}`
                );
            }
        }
    } catch (error) {
        logger.error('Dynamic pricing error:', error);
    }
};

// Auto-restock suggestions
export const generateRestockSuggestions = async () => {
    try {
        const suggestions = await Product.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    let: { productId: '$_id' },
                    pipeline: [
                        { $unwind: '$items' },
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$items.product', '$$productId'],
                                },
                                paymentStatus: 'paid',
                                createdAt: {
                                    $gte: new Date(
                                        Date.now() - 30 * 24 * 60 * 60 * 1000
                                    ),
                                },
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                totalSold: { $sum: '$items.quantity' },
                                avgDailyDemand: { $avg: '$items.quantity' },
                            },
                        },
                    ],
                    as: 'salesData',
                },
            },
            {
                $addFields: {
                    salesInfo: { $arrayElemAt: ['$salesData', 0] },
                    daysOfStock: {
                        $cond: [
                            {
                                $gt: [
                                    {
                                        $arrayElemAt: [
                                            '$salesData.avgDailyDemand',
                                            0,
                                        ],
                                    },
                                    0,
                                ],
                            },
                            {
                                $divide: [
                                    '$stock',
                                    {
                                        $arrayElemAt: [
                                            '$salesData.avgDailyDemand',
                                            0,
                                        ],
                                    },
                                ],
                            },
                            999,
                        ],
                    },
                },
            },
            {
                $match: {
                    $or: [
                        { stock: { $lte: '$lowStockThreshold' } },
                        { daysOfStock: { $lt: 14 } },
                    ],
                },
            },
            {
                $project: {
                    title: 1,
                    currentStock: '$stock',
                    lowStockThreshold: 1,
                    monthlySales: '$salesInfo.totalSold',
                    avgDailyDemand: '$salesInfo.avgDailyDemand',
                    daysOfStock: 1,
                    suggestedRestock: {
                        $max: [
                            { $multiply: ['$salesInfo.avgDailyDemand', 30] }, // 30 days supply
                            { $multiply: ['$lowStockThreshold', 2] }, // 2x threshold
                        ],
                    },
                    priority: {
                        $cond: [
                            { $lte: ['$daysOfStock', 7] },
                            'URGENT',
                            {
                                $cond: [
                                    { $lte: ['$daysOfStock', 14] },
                                    'HIGH',
                                    'MEDIUM',
                                ],
                            },
                        ],
                    },
                },
            },
            { $sort: { daysOfStock: 1 } },
        ]);

        return suggestions;
    } catch (error) {
        logger.error('Restock suggestions error:', error);
        return [];
    }
};

// Loyalty program automation
export const processLoyaltyRewards = async () => {
    try {
        const users = await User.find().populate('wallet');

        for (const user of users) {
            // Calculate user's total spending
            const totalSpent = await Order.aggregate([
                { $match: { user: user._id, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]);

            const spentAmount = totalSpent[0]?.total || 0;

            // Loyalty tiers
            let loyaltyTier = 'Bronze';
            let rewardPercentage = 0.01; // 1%

            if (spentAmount >= 100000) {
                // ₦100,000
                loyaltyTier = 'Gold';
                rewardPercentage = 0.03; // 3%
            } else if (spentAmount >= 50000) {
                // ₦50,000
                loyaltyTier = 'Silver';
                rewardPercentage = 0.02; // 2%
            }

            // Check if user has pending loyalty rewards
            const lastRewardDate = user.lastLoyaltyReward || new Date(0);
            const recentOrders = await Order.find({
                user: user._id,
                paymentStatus: 'paid',
                createdAt: { $gt: lastRewardDate },
            });

            if (recentOrders.length > 0) {
                const rewardAmount = Math.round(
                    recentOrders.reduce(
                        (sum, order) => sum + order.totalAmount,
                        0
                    ) * rewardPercentage
                );

                if (rewardAmount > 0) {
                    // Add loyalty reward to wallet
                    user.wallet.balance += rewardAmount;
                    await user.wallet.save();

                    // Create transaction record
                    await Transaction.create({
                        wallet: user.wallet._id,
                        user: user._id,
                        type: 'credit',
                        amount: rewardAmount,
                        reason: 'LOYALTY_REWARD',
                        description: `${loyaltyTier} tier loyalty reward (${(rewardPercentage * 100).toFixed(1)}%)`,
                    });

                    // Update user's last reward date
                    user.lastLoyaltyReward = new Date();
                    user.loyaltyTier = loyaltyTier;
                    await user.save();

                    logger.info(
                        `Loyalty reward processed: ${user.email} - ₦${rewardAmount} (${loyaltyTier})`
                    );
                }
            }
        }
    } catch (error) {
        logger.error('Loyalty rewards error:', error);
    }
};
