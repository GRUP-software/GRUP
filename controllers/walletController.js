import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { getWalletDataWithAggregation } from '../utils/walletTransactionService.js';
import {
    getWalletStatistics,
    calculateWalletOffset as calculateOffset,
} from '../utils/walletCalculationService.js';
import {
    getCachedWalletData,
    cacheWalletData,
    invalidateWalletCache,
    CACHE_KEYS,
} from '../utils/cacheManager.js';

export const getWalletData = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Try to get from cache first
        const cachedData = await getCachedWalletData(userId);
        if (cachedData && page === 1) {
            return res.json(cachedData);
        }

        // Get fresh data with aggregation for better performance
        const walletData = await getWalletDataWithAggregation(
            userId,
            page,
            limit
        );

        // Get comprehensive statistics
        const walletStats = await getWalletStatistics(userId);

        // Combine data
        const responseData = {
            ...walletData,
            stats: {
                ...walletData.stats,
                ...walletStats.referralStats,
            },
            referralInfo: {
                totalReferrals: walletStats.referralStats.totalReferrals,
                completedRounds: walletStats.referralStats.completedRounds,
                referralsNeededForNextBonus:
                    walletStats.referralStats.referralsNeededForNextBonus,
                progressPercentage:
                    walletStats.referralStats.progressPercentage,
                totalBonusEarned: walletStats.referralStats.totalBonusEarned,
                bonusesActuallyGiven:
                    walletStats.referralStats.bonusesActuallyGiven,
                missingBonuses: walletStats.referralStats.missingBonuses,
            },
        };

        // Cache the data for future requests
        if (page === 1) {
            await cacheWalletData(userId, responseData, 300); // 5 minutes TTL
        }

        res.json(responseData);
    } catch (error) {
        console.error('Get wallet data error:', error);
        res.status(500).json({
            message: 'Error fetching wallet data',
            error: error.message,
        });
    }
};

// Calculate wallet offset for checkout
export const calculateWalletOffset = async (req, res) => {
    try {
        const { totalAmount, requestedWalletUse } = req.body;
        const userId = req.user.id;

        const result = await calculateOffset(
            userId,
            totalAmount,
            requestedWalletUse
        );
        res.json(result);
    } catch (error) {
        console.error('Calculate wallet offset error:', error);
        res.status(500).json({
            message: 'Error calculating wallet offset',
            error: error.message,
        });
    }
};

// Get transaction history with filters
export const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, reason, page = 1, limit = 20 } = req.query;

        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.json({
                transactions: [],
                pagination: { page: 1, limit: 20, total: 0, pages: 0 },
            });
        }

        // Build filter
        const filter = { wallet: wallet._id };
        if (type) filter.type = type;
        if (reason) filter.reason = reason;

        const skip = (page - 1) * limit;

        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('metadata.orderId', 'trackingNumber totalAmount')
            .populate('metadata.groupBuyId', 'productId status unitsSold');

        const total = await Transaction.countDocuments(filter);

        const formattedTransactions = transactions.map((transaction) => ({
            id: transaction._id,
            type: transaction.type,
            amount: transaction.amount,
            reason: transaction.reason,
            description: transaction.description,
            createdAt: transaction.createdAt,
            metadata: {
                orderId: transaction.metadata?.orderId?._id,
                orderTrackingNumber:
                    transaction.metadata?.orderId?.trackingNumber,
                groupBuyId: transaction.metadata?.groupBuyId?._id,
                groupBuyStatus: transaction.metadata?.groupBuyId?.status,
                referralCount: transaction.metadata?.referralCount,
            },
        }));

        res.json({
            transactions: formattedTransactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        });
    } catch (error) {
        console.error('Get transaction history error:', error);
        res.status(500).json({
            message: 'Error fetching transaction history',
            error: error.message,
        });
    }
};

// Invalidate wallet cache (for admin/debug purposes)
export const invalidateCache = async (req, res) => {
    try {
        const userId = req.user.id;
        const invalidatedCount = await invalidateWalletCache(userId);

        res.json({
            success: true,
            message: `Invalidated ${invalidatedCount} cache entries`,
            invalidatedCount,
        });
    } catch (error) {
        console.error('Invalidate cache error:', error);
        res.status(500).json({
            message: 'Error invalidating cache',
            error: error.message,
        });
    }
};
