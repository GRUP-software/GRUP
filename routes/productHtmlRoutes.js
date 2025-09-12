import express from 'express';
import Product from '../models/Product.js';
import GroupBuy from '../models/GroupBuy.js';

const router = express.Router();

// Serve HTML with meta tags for product pages (for social media crawlers)
router.get('/product/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const CLIENT_URL = process.env.FRONTEND_URL || 'https://grup.com.ng';
        
        // Find the product by slug
        const product = await Product.findOne({ slug });
        
        if (!product) {
            return res.redirect(301, CLIENT_URL); // permanent redirect if not found
        }

        const formattedName = `${product.title} | ₦${product.price.toLocaleString()}`;
        const productImage = product.images && product.images.length > 0 
            ? product.images[0] 
            : 'https://res.cloudinary.com/dafkhnw7p/image/upload/v1755722659/WhatsApp_Image_2025-08-10_at_17.39.41_ef2d2dfe_m8okfh.jpg';

        // Generate HTML with proper meta tags
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${formattedName}</title>
                <meta name="description" content="${product.description || 'Buy Together, Save Together'}">
                
                <!-- Open Graph Meta Tags -->
                <meta property="og:title" content="${formattedName}">
                <meta property="og:description" content="${product.description || 'Buy Together, Save Together'}">
                <meta property="og:image" content="${productImage}">
                <meta property="og:url" content="${CLIENT_URL}/product/${product.slug}">
                <meta property="og:type" content="product">
                <meta property="og:site_name" content="Grup">
                
                <!-- Twitter Card Meta Tags -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="${formattedName}">
                <meta name="twitter:description" content="${product.description || 'Buy Together, Save Together'}">
                <meta name="twitter:image" content="${productImage}">
                
                <!-- Additional Product Meta Tags -->
                <meta property="product:price:amount" content="${product.price}">
                <meta property="product:price:currency" content="NGN">
                
                <!-- Canonical URL -->
                <link rel="canonical" href="${CLIENT_URL}/product/${product.slug}">
                
                <!-- Redirect to frontend after a short delay -->
                <script>
                    setTimeout(() => {
                        window.location.href = '${CLIENT_URL}/product/${product.slug}';
                    }, 1000);
                </script>
            </head>
            <body>
                <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                    <h1>${formattedName}</h1>
                    <p>${product.description || 'Buy Together, Save Together'}</p>
                    <p>Redirecting to product page...</p>
                    <img src="${productImage}" alt="${product.title}" style="max-width: 300px; height: auto; margin: 20px 0;">
                    <br>
                    <a href="${CLIENT_URL}/product/${product.slug}" style="color: #2a9d8e; text-decoration: none; font-weight: bold;">
                        View Product on Grup
                    </a>
                </div>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error('Error serving product HTML:', error);
        const CLIENT_URL = process.env.FRONTEND_URL || 'https://grup.com.ng';
        return res.redirect(301, CLIENT_URL);
    }
});

export default router;
