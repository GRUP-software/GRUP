import express from 'express';
import Product from '../models/Product.js';
import GroupBuy from '../models/GroupBuy.js';

const router = express.Router();

// Serve meta tags for product pages (for social media crawlers)
// This endpoint will be called by the frontend to get meta tag data
router.get('/api/product-meta/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        // Find the product by slug
        const product = await Product.findOne({ slug });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Get group buy data
        const groupBuy = await GroupBuy.findOne({ productId: product._id })
            .sort({ createdAt: -1 })
            .populate('productId', 'title price');

        // Prepare product data
        const productData = {
            ...product.toObject(),
            description: product.description || '',
            images: product.images || [],
            price: product.price || 0,
            basePrice: product.basePrice || 0,
            title: product.title || 'Untitled Product',
            slug: product.slug || '',
        };

        // Get the first image or use fallback
        const productImage =
            productData.images && productData.images.length > 0
                ? productData.images[0]
                : 'https://res.cloudinary.com/dafkhnw7p/image/upload/v1755722659/WhatsApp_Image_2025-08-10_at_17.39.41_ef2d2dfe_m8okfh.jpg';

        // Ensure image URL is absolute
        const absoluteImageUrl = productImage.startsWith('http')
            ? productImage
            : `${req.protocol}://${req.get('host')}${productImage}`;

        // Truncate description for meta tags
        const metaDescription = productData.description
            ? productData.description.substring(0, 160) +
              (productData.description.length > 160 ? '...' : '')
            : 'Buy Together, Save Together';

        // Get current URL
        const currentUrl = `${req.protocol}://${req.get('host')}/product/${productData.slug}`;
        const frontendUrl = process.env.FRONTEND_URL || 'https://grup.com.ng';

        // Return meta tag data as JSON
        res.json({
            success: true,
            data: {
                title: `Grup - ${productData.title}`,
                description: metaDescription,
                image: absoluteImageUrl,
                url: currentUrl,
                type: 'product',
                siteName: 'Grup',
                price: productData.price,
                currency: 'NGN',
            },
        });
    } catch (error) {
        console.error('Error getting product meta:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting product meta data',
        });
    }
});

export default router;
