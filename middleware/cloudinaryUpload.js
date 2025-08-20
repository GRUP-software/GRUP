import multer from "multer";
import path from "path";
import cloudinaryService from "../services/cloudinaryService.js";

// Multer memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow images and common file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased for Cloudinary)
    files: 10, // Maximum 10 files
  },
});

/**
 * Middleware to upload images to Cloudinary
 * @param {string} fieldName - Name of the form field containing the image(s)
 * @param {number} maxFiles - Maximum number of files to upload
 * @returns {Function} Express middleware
 */
export const uploadToCloudinary = (fieldName = 'images', maxFiles = 5) => {
  return [
    upload.array(fieldName, maxFiles),
    async (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          return next();
        }

        console.log(`📤 Uploading ${req.files.length} image(s) to Cloudinary...`);

        const uploadPromises = req.files.map(async (file) => {
          try {
            // Convert buffer to base64 for Cloudinary
            const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            
            // Generate a unique public ID
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 15);
            const publicId = `${file.fieldname}_${timestamp}_${randomId}`;

            // Upload to Cloudinary
            const result = await cloudinaryService.uploadImage(base64Image, publicId, {
              resource_type: 'image',
              transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
              ]
            });

            return {
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              cloudinary: result
            };
          } catch (error) {
            console.error(`❌ Failed to upload ${file.originalname}:`, error);
            throw error;
          }
        });

        const uploadResults = await Promise.all(uploadPromises);
        
        // Add Cloudinary results to request object
        req.cloudinaryResults = uploadResults;
        
        console.log(`✅ Successfully uploaded ${uploadResults.length} image(s) to Cloudinary`);
        
        next();
      } catch (error) {
        console.error('❌ Cloudinary upload middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to upload images',
          error: error.message
        });
      }
    }
  ];
};

/**
 * Middleware to upload a single image to Cloudinary
 * @param {string} fieldName - Name of the form field containing the image
 * @returns {Function} Express middleware
 */
export const uploadSingleToCloudinary = (fieldName = 'image') => {
  return [
    upload.single(fieldName),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return next();
        }

        console.log(`📤 Uploading single image to Cloudinary: ${req.file.originalname}`);

        // Convert buffer to base64 for Cloudinary
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        // Generate a unique public ID
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const publicId = `${req.file.fieldname}_${timestamp}_${randomId}`;

        // Upload to Cloudinary
        const result = await cloudinaryService.uploadImage(base64Image, publicId, {
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        });

        // Add Cloudinary result to request object
        req.cloudinaryResult = {
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          cloudinary: result
        };
        
        console.log(`✅ Successfully uploaded image to Cloudinary: ${result.public_id}`);
        
        next();
      } catch (error) {
        console.error('❌ Single image Cloudinary upload error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to upload image',
          error: error.message
        });
      }
    }
  ];
};

export default upload;
