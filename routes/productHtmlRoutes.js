import express from 'express';
import Product from '../models/Product.js';
import GroupBuy from '../models/GroupBuy.js';

const router = express.Router();

// Function to generate dynamic description
const generateDynamicDescription = (productName) => {
    return `Wow, I just bought ${productName}! Click on the link so we can complete the order.`;
};

// Serve HTML with meta tags for product pages (for social media crawlers)
router.get('/product/:slug', async (req, res) => {
    const { slug } = req.params;

    // Find the product by slug
    const product = await Product.findOne({ slug });

    // For bots, prepare product data and return HTML with meta tags
    const productData = {
        ...product.toObject(),
        description: product.description || '',
        image: product.image[0] || [],
        price: product.price || 0,
        basePrice: product.basePrice || 0,
        title: product.title || 'Untitled Product',
        slug: product.slug || '',
    };

    // Get frontend URL for canonical link
    const frontendUrl = `${process.env.FRONTEND_URL}/product/${productData.slug}`;

    // Generate clean HTML with proper meta tags for social media crawlers
    const html = `
           
        `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

export default router;
