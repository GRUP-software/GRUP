import ShoppingRegion from '../models/ShoppingRegion.js';
import Product from '../models/Product.js';
import { CacheManager } from '../utils/cacheManager.js';

// Get all available shopping regions
export const getShoppingRegions = async (req, res) => {
    try {
        const cacheKey = 'shopping-regions';

        const regions = await CacheManager.wrap(
            cacheKey,
            async () => {
                return await ShoppingRegion.find({ isActive: true })
                    .sort({ priority: -1, name: 1 })
                    .select('name displayName state features') // Removed coordinates
                    .lean();
            },
            1800 // 30 minutes cache
        );

        res.json({
            success: true,
            regions,
            message: 'Shopping regions fetched successfully',
        });
    } catch (error) {
        console.error('Get shopping regions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching shopping regions',
            error: error.message,
        });
    }
};

// Set user's shopping region
export const setUserRegion = async (req, res) => {
    try {
        const { regionId } = req.body; // Removed coordinates
        const userId = req.user?.id;

        // Validate region exists
        const region = await ShoppingRegion.findById(regionId);
        if (!region) {
            return res.status(404).json({
                success: false,
                message: 'Shopping region not found',
            });
        }

        // Store in session/user preferences
        req.session = req.session || {};
        req.session.shoppingRegion = {
            id: region._id,
            name: region.name,
            displayName: region.displayName,
            features: region.features,
            setAt: new Date(),
        };

        // If user is logged in, save to their profile
        if (userId) {
            const User = (await import('../models/User.js')).default;
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'preferences.shoppingRegion': region._id,
                    'preferences.lastRegionUpdate': new Date(),
                },
            });
        }

        // Get region-specific data
        const regionData = await getRegionSpecificData(region._id);

        res.json({
            success: true,
            message: `Shopping region set to ${region.displayName}`,
            region: {
                ...region.toObject(),
                ...regionData,
            },
        });
    } catch (error) {
        console.error('Set user region error:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting shopping region',
            error: error.message,
        });
    }
};

// Get region-specific products and offers
export const getRegionProducts = async (req, res) => {
    try {
        const { regionId } = req.params;
        const { category, page = 1, limit = 20 } = req.query;

        const region = await ShoppingRegion.findById(regionId);
        if (!region) {
            return res.status(404).json({
                success: false,
                message: 'Shopping region not found',
            });
        }

        const cacheKey = `region-products:${regionId}:${category || 'all'}:${page}:${limit}`;

        const result = await CacheManager.wrap(
            cacheKey,
            async () => {
                // Build query for region-specific products
                const query = { stock: { $gt: 0 } };
                if (category) query.category = category;

                // Get products available in this region
                const products = await Product.find(query)
                    .limit(limit * 1)
                    .skip((page - 1) * limit)
                    .sort({ createdAt: -1 })
                    .lean();

                // Add region-specific pricing/availability
                const enrichedProducts = products.map((product) => ({
                    ...product,
                    regionalInfo: {
                        deliveryTime: region.features.sameDay
                            ? 'Same day'
                            : 'Next day',
                        cashOnDelivery: region.features.cashOnDelivery,
                        groupBuyingAvailable: region.features.groupBuying,
                    },
                }));

                const total = await Product.countDocuments(query);

                return {
                    products: enrichedProducts,
                    pagination: {
                        page: Number.parseInt(page),
                        limit: Number.parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit),
                    },
                };
            },
            600 // 10 minutes cache
        );

        res.json({
            success: true,
            region: region.displayName,
            ...result,
        });
    } catch (error) {
        console.error('Get region products error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching region products',
            error: error.message,
        });
    }
};

// Removed detectUserRegion endpoint as it relies on coordinates.

// Helper function to get region-specific data
const getRegionSpecificData = async (regionId) => {
    try {
        const [productCount, activeGroups, avgDeliveryTime] = await Promise.all(
            [
                Product.countDocuments({ stock: { $gt: 0 } }),

                Product.aggregate([
                    {
                        $lookup: {
                            from: 'groupbuys',
                            localField: '_id',
                            foreignField: 'productId',
                            as: 'groups',
                        },
                    },
                    {
                        $match: {
                            'groups.status': 'forming',
                        },
                    },
                    { $count: 'activeGroups' },
                ]),

                // Mock delivery time calculation
                24, // hours
            ]
        );

        return {
            stats: {
                availableProducts: productCount,
                activeGroupBuys: activeGroups[0]?.activeGroups || 0,
                avgDeliveryTime,
            },
        };
    } catch (error) {
        console.error('Get region data error:', error);
        return { stats: {} };
    }
};
