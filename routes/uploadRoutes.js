import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyAdminToken } from '../routes/adminAuthRoutes.js';
import {
    uploadToCloudinary,
    uploadSingleToCloudinary,
} from '../middleware/cloudinaryUpload.js';
import cloudinaryService from '../services/cloudinaryService.js';
import UploadedImage from '../models/uploadedImage.js';

const router = express.Router();

// Upload single image
router.post(
    '/single',
    verifyToken,
    uploadSingleToCloudinary('image'),
    async (req, res) => {
        try {
            if (!req.cloudinaryResult) {
                return res.status(400).json({
                    success: false,
                    message: 'No image provided',
                });
            }

            // Save to UploadedImage database for admin panel
            const uploadedImage = await UploadedImage.create({
                filename: req.cloudinaryResult.cloudinary.public_id,
                originalName: req.cloudinaryResult.originalName,
                url: req.cloudinaryResult.cloudinary.url,
                size: req.cloudinaryResult.size,
                mimetype: req.cloudinaryResult.mimetype,
                uploadedBy: req.user.email || 'admin',
                description:
                    req.body.description ||
                    `Uploaded image: ${req.cloudinaryResult.originalName}`,
                tags: req.body.tags
                    ? req.body.tags.split(',').map((tag) => tag.trim())
                    : [],
            });

            res.json({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    image: req.cloudinaryResult.cloudinary,
                    originalName: req.cloudinaryResult.originalName,
                    size: req.cloudinaryResult.size,
                    uploadedImage: uploadedImage,
                },
            });
        } catch (error) {
            console.error('Upload single image error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload image',
                error: error.message,
            });
        }
    }
);

// Upload multiple images
router.post(
    '/multiple',
    verifyToken,
    uploadToCloudinary('images', 10),
    async (req, res) => {
        try {
            if (!req.cloudinaryResults || req.cloudinaryResults.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No images provided',
                });
            }

            // Save all images to UploadedImage database for admin panel
            const uploadedImages = [];
            for (const result of req.cloudinaryResults) {
                const uploadedImage = await UploadedImage.create({
                    filename: result.cloudinary.public_id,
                    originalName: result.originalName,
                    url: result.cloudinary.url,
                    size: result.size,
                    mimetype: result.mimetype,
                    uploadedBy: req.user.email || 'admin',
                    description:
                        req.body.description ||
                        `Uploaded image: ${result.originalName}`,
                    tags: req.body.tags
                        ? req.body.tags.split(',').map((tag) => tag.trim())
                        : [],
                });
                uploadedImages.push(uploadedImage);
            }

            res.json({
                success: true,
                message: `${req.cloudinaryResults.length} image(s) uploaded successfully`,
                data: {
                    images: req.cloudinaryResults.map((result, index) => ({
                        cloudinary: result.cloudinary,
                        originalName: result.originalName,
                        size: result.size,
                        uploadedImage: uploadedImages[index],
                    })),
                    totalCount: req.cloudinaryResults.length,
                    uploadedImages: uploadedImages,
                },
            });
        } catch (error) {
            console.error('Upload multiple images error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload images',
                error: error.message,
            });
        }
    }
);

// Delete image from Cloudinary and database
router.delete('/:publicId', verifyToken, async (req, res) => {
    try {
        const { publicId } = req.params;

        // Delete from Cloudinary
        const cloudinaryResult = await cloudinaryService.deleteImage(publicId);

        // Delete from database
        const dbResult = await UploadedImage.findOneAndDelete({
            filename: publicId,
        });

        res.json({
            success: true,
            message: 'Image deleted successfully from Cloudinary and database',
            data: {
                cloudinary: cloudinaryResult,
                database: dbResult,
            },
        });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image',
            error: error.message,
        });
    }
});

// Get Cloudinary environment info
router.get('/info', verifyToken, async (req, res) => {
    try {
        const info = cloudinaryService.getEnvironmentInfo();

        res.json({
            success: true,
            data: info,
        });
    } catch (error) {
        console.error('Get Cloudinary info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Cloudinary info',
            error: error.message,
        });
    }
});

// Get image URL with transformations
router.get('/url/:publicId', verifyToken, async (req, res) => {
    try {
        const { publicId } = req.params;
        const { width, height, quality, format, crop } = req.query;

        const transformations = {};
        if (width) transformations.width = parseInt(width);
        if (height) transformations.height = parseInt(height);
        if (quality) transformations.quality = quality;
        if (format) transformations.fetch_format = format;
        if (crop) transformations.crop = crop;

        const url = cloudinaryService.getImageUrl(publicId, transformations);

        res.json({
            success: true,
            data: {
                url,
                publicId,
                transformations,
            },
        });
    } catch (error) {
        console.error('Get image URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate image URL',
            error: error.message,
        });
    }
});

// Admin-specific upload routes (for admin panel)
router.post(
    '/admin/single',
    verifyAdminToken,
    uploadSingleToCloudinary('image'),
    async (req, res) => {
        try {
            if (!req.cloudinaryResult) {
                return res.status(400).json({
                    success: false,
                    message: 'No image provided',
                });
            }

            // Save to UploadedImage database for admin panel
            const uploadedImage = await UploadedImage.create({
                filename: req.cloudinaryResult.cloudinary.public_id,
                originalName: req.cloudinaryResult.originalName,
                url: req.cloudinaryResult.cloudinary.url,
                size: req.cloudinaryResult.size,
                mimetype: req.cloudinaryResult.mimetype,
                uploadedBy: req.admin.email || 'admin',
                description:
                    req.body.description ||
                    `Uploaded image: ${req.cloudinaryResult.originalName}`,
                tags: req.body.tags
                    ? req.body.tags.split(',').map((tag) => tag.trim())
                    : [],
            });

            res.json({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    image: req.cloudinaryResult.cloudinary,
                    originalName: req.cloudinaryResult.originalName,
                    size: req.cloudinaryResult.size,
                    uploadedImage: uploadedImage,
                },
            });
        } catch (error) {
            console.error('Admin upload single image error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload image',
                error: error.message,
            });
        }
    }
);

// Admin multiple upload route
router.post(
    '/admin/multiple',
    verifyAdminToken,
    uploadToCloudinary('images', 10),
    async (req, res) => {
        try {
            if (!req.cloudinaryResults || req.cloudinaryResults.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No images provided',
                });
            }

            // Save all images to UploadedImage database for admin panel
            const uploadedImages = [];
            for (const result of req.cloudinaryResults) {
                const uploadedImage = await UploadedImage.create({
                    filename: result.cloudinary.public_id,
                    originalName: result.originalName,
                    url: result.cloudinary.url,
                    size: result.size,
                    mimetype: result.mimetype,
                    uploadedBy: req.admin.email || 'admin',
                    description:
                        req.body.description ||
                        `Uploaded image: ${result.originalName}`,
                    tags: req.body.tags
                        ? req.body.tags.split(',').map((tag) => tag.trim())
                        : [],
                });
                uploadedImages.push(uploadedImage);
            }

            res.json({
                success: true,
                message: `${req.cloudinaryResults.length} image(s) uploaded successfully`,
                data: {
                    images: req.cloudinaryResults.map((result, index) => ({
                        cloudinary: result.cloudinary,
                        originalName: result.originalName,
                        size: result.size,
                        uploadedImage: uploadedImages[index],
                    })),
                    totalCount: req.cloudinaryResults.length,
                    uploadedImages: uploadedImages,
                },
            });
        } catch (error) {
            console.error('Admin upload multiple images error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload images',
                error: error.message,
            });
        }
    }
);

export default router;
