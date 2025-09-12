import express from 'express';
import Product from '../models/Product.js';
import GroupBuy from '../models/GroupBuy.js';

const router = express.Router();

// Function to detect if request is from a social media crawler
const isSocialMediaCrawler = (userAgent) => {
    if (!userAgent) return false;
    
    const crawlerPatterns = [
        'WhatsApp',
        'facebookexternalhit',
        'Twitterbot',
        'LinkedInBot',
        'Slackbot',
        'TelegramBot',
        'SkypeUriPreview',
        'Discordbot',
        'Applebot',
        'Googlebot'
    ];
    
    return crawlerPatterns.some(pattern => 
        userAgent.toLowerCase().includes(pattern.toLowerCase())
    );
};

// Function to generate dynamic description
const generateDynamicDescription = (productName) => {
    return `Wow, I just bought ${productName}! Click on the link so we can complete the order.`;
};

// Serve HTML with meta tags for product pages (for social media crawlers)
router.get('/product/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const userAgent = req.get('User-Agent');
        const isBot = isSocialMediaCrawler(userAgent);
        
        // Find the product by slug
        const product = await Product.findOne({ slug });
        
        if (!product) {
            // For bots, return 404 page with meta tags
            if (isBot) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Product Not Found - Grup</title>
                        <meta name="description" content="Product not found on Grup">
                        <meta property="og:title" content="Product Not Found - Grup">
                        <meta property="og:description" content="Product not found on Grup">
                        <meta property="og:image" content="https://res.cloudinary.com/dafkhnw7p/image/upload/v1755722659/WhatsApp_Image_2025-08-10_at_17.39.41_ef2d2dfe_m8okfh.jpg">
                        <meta property="og:url" content="${req.protocol}://${req.get('host')}/product/${slug}">
                        <meta property="og:type" content="website">
                        <meta property="og:site_name" content="Grup">
                        <meta name="twitter:card" content="summary_large_image">
                        <meta name="twitter:title" content="Product Not Found - Grup">
                        <meta name="twitter:description" content="Product not found on Grup">
                        <meta name="twitter:image" content="https://res.cloudinary.com/dafkhnw7p/image/upload/v1755722659/WhatsApp_Image_2025-08-10_at_17.39.41_ef2d2dfe_m8okfh.jpg">
                    </head>
                    <body>
                        <h1>Product Not Found</h1>
                        <p>The product you're looking for doesn't exist.</p>
                    </body>
                    </html>
                `);
            }
            
            // For real users, redirect to frontend
            const frontendUrl = process.env.FRONTEND_URL || 'https://grup.com.ng';
            return res.redirect(302, `${frontendUrl}/product/${slug}`);
        }

        // If it's a real user (not a bot), redirect immediately to frontend
        if (!isBot) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://grup.com.ng';
            return res.redirect(302, `${frontendUrl}/product/${slug}`);
        }

        // For bots, prepare product data and return HTML with meta tags
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
        const productImage = productData.images && productData.images.length > 0 
            ? productData.images[0] 
            : 'https://res.cloudinary.com/dafkhnw7p/image/upload/v1755722659/WhatsApp_Image_2025-08-10_at_17.39.41_ef2d2dfe_m8okfh.jpg';

        // Ensure image URL is absolute
        const absoluteImageUrl = productImage.startsWith('http') 
            ? productImage 
            : `${req.protocol}://${req.get('host')}${productImage}`;

        // Generate dynamic description for social sharing
        const dynamicDescription = generateDynamicDescription(productData.title);
        
        // Get frontend URL for canonical link
        const frontendUrl = process.env.FRONTEND_URL || 'https://grup.com.ng';

        // Generate clean HTML with proper meta tags for social media crawlers
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Grup - ${productData.title}</title>
                <meta name="description" content="${dynamicDescription}">
                
                <!-- Open Graph Meta Tags -->
                <meta property="og:title" content="Grup - ${productData.title}">
                <meta property="og:description" content="${dynamicDescription}">
                <meta property="og:image" content="${absoluteImageUrl}">
                <meta property="og:url" content="${frontendUrl}/product/${productData.slug}">
                <meta property="og:type" content="product">
                <meta property="og:site_name" content="Grup">
                
                <!-- Twitter Card Meta Tags -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="Grup - ${productData.title}">
                <meta name="twitter:description" content="${dynamicDescription}">
                <meta name="twitter:image" content="${absoluteImageUrl}">
                
                <!-- Additional Product Meta Tags -->
                ${productData.price ? `<meta property="product:price:amount" content="${productData.price}">` : ''}
                ${productData.price ? `<meta property="product:price:currency" content="NGN">` : ''}
                
                <!-- Canonical URL -->
                <link rel="canonical" href="${frontendUrl}/product/${productData.slug}">
            </head>
            <body>
                <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                    <h1>Grup - ${productData.title}</h1>
                    <p>${dynamicDescription}</p>
                    <p><a href="${frontendUrl}/product/${productData.slug}">View Product on Grup</a></p>
                </div>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error('Error serving product HTML:', error);
        
        const userAgent = req.get('User-Agent');
        const isBot = isSocialMediaCrawler(userAgent);
        
        // For real users, redirect to frontend on error
        if (!isBot) {
            const frontendUrl = process.env.FRONTEND_URL || 'https://grup.com.ng';
            return res.redirect(302, `${frontendUrl}/product/${req.params.slug}`);
        }
        
        // For bots, return error page with meta tags
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error - Grup</title>
                <meta name="description" content="An error occurred while loading the product">
                <meta property="og:title" content="Error - Grup">
                <meta property="og:description" content="An error occurred while loading the product">
                <meta property="og:image" content="https://res.cloudinary.com/dafkhnw7p/image/upload/v1755722659/WhatsApp_Image_2025-08-10_at_17.39.41_ef2d2dfe_m8okfh.jpg">
                <meta property="og:url" content="${req.protocol}://${req.get('host')}/product/${req.params.slug}">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="Grup">
            </head>
            <body>
                <h1>Error Loading Product</h1>
                <p>Sorry, there was an error loading this product.</p>
            </body>
            </html>
        `);
    }
});

export default router;
