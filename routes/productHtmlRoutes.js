import express from 'express';
import Product from '../models/Product.js';
import GroupBuy from '../models/GroupBuy.js';

const router = express.Router();

// Serve HTML with meta tags for product pages (for social media crawlers)
router.get('/product/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Find the product by slug
        const product = await Product.findOne({ slug });
        
        if (!product) {
            // Return 404 page with basic meta tags
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
                    <script>
                        // Redirect to frontend after a short delay
                    setTimeout(() => {
                        window.location.href = '${process.env.FRONTEND_URL || 'https://grup.com.ng'}/product/${slug}';
                    }, 1000);
                    </script>
                </body>
                </html>
            `);
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
        const productImage = productData.images && productData.images.length > 0 
            ? productData.images[0] 
            : 'https://res.cloudinary.com/dafkhnw7p/image/upload/v1755722659/WhatsApp_Image_2025-08-10_at_17.39.41_ef2d2dfe_m8okfh.jpg';

        // Ensure image URL is absolute
        const absoluteImageUrl = productImage.startsWith('http') 
            ? productImage 
            : `${req.protocol}://${req.get('host')}${productImage}`;

        // Truncate description for meta tags
        const metaDescription = productData.description 
            ? productData.description.substring(0, 160) + (productData.description.length > 160 ? '...' : '')
            : 'Buy Together, Save Together';

        // Get current URL
        const currentUrl = `${req.protocol}://${req.get('host')}/product/${productData.slug}`;
        const frontendUrl = process.env.FRONTEND_URL || 'https://grup.com.ng';

        // Generate HTML with proper meta tags
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Grup - ${productData.title}</title>
                <meta name="description" content="${metaDescription}">
                
                <!-- Open Graph Meta Tags -->
                <meta property="og:title" content="Grup - ${productData.title}">
                <meta property="og:description" content="${metaDescription}">
                <meta property="og:image" content="${absoluteImageUrl}">
                <meta property="og:url" content="${currentUrl}">
                <meta property="og:type" content="product">
                <meta property="og:site_name" content="Grup">
                
                <!-- Twitter Card Meta Tags -->
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="Grup - ${productData.title}">
                <meta name="twitter:description" content="${metaDescription}">
                <meta name="twitter:image" content="${absoluteImageUrl}">
                
                <!-- Additional Product Meta Tags -->
                ${productData.price ? `<meta property="product:price:amount" content="${productData.price}">` : ''}
                ${productData.price ? `<meta property="product:price:currency" content="NGN">` : ''}
                
                <!-- Canonical URL -->
                <link rel="canonical" href="${frontendUrl}/product/${productData.slug}">
                
                <!-- Redirect to frontend after a short delay -->
                <script>
                    setTimeout(() => {
                        window.location.href = '${frontendUrl}/product/${productData.slug}';
                    }, 1000);
                </script>
            </head>
            <body>
                <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
                    <h1>${productData.title}</h1>
                    <p>${metaDescription}</p>
                    <p>Redirecting to product page...</p>
                    <img src="${absoluteImageUrl}" alt="${productData.title}" style="max-width: 300px; height: auto; margin: 20px 0;">
                    <br>
                    <a href="${frontendUrl}/product/${productData.slug}" style="color: #2a9d8e; text-decoration: none; font-weight: bold;">
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
        
        // Return error page
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
                <script>
                    setTimeout(() => {
                        window.location.href = '${process.env.FRONTEND_URL || 'https://grup.com.ng'}';
                    }, 2000);
                </script>
            </body>
            </html>
        `);
    }
});

export default router;
