import { v2 as cloudinary } from "cloudinary";
import config from "../config/environment.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY.CLOUD_NAME,
  api_key: config.CLOUDINARY.API_KEY,
  api_secret: config.CLOUDINARY.API_SECRET,
});

// Get environment-specific folder
const getEnvironmentFolder = () => {
  return config.CLOUDINARY.FOLDER;
};

class CloudinaryService {
  constructor() {
    this.folder = getEnvironmentFolder();
    console.log(`🌤️  Cloudinary configured for folder: ${this.folder}`);
  }

  /**
   * Upload a single image to Cloudinary
   * @param {Buffer|string} file - File buffer or file path
   * @param {string} publicId - Optional public ID for the image
   * @param {Object} options - Additional upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadImage(file, publicId = null, options = {}) {
    try {
      const uploadOptions = {
        folder: this.folder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
        ...options,
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const result = await cloudinary.uploader.upload(file, uploadOptions);

      console.log(`✅ Image uploaded successfully: ${result.public_id}`);

      return {
        success: true,
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        folder: result.folder,
      };
    } catch (error) {
      console.error("❌ Cloudinary upload error:", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload multiple images to Cloudinary
   * @param {Array} files - Array of file buffers or paths
   * @param {Array} publicIds - Optional array of public IDs
   * @param {Object} options - Additional upload options
   * @returns {Promise<Array>} Array of upload results
   */
  async uploadMultipleImages(files, publicIds = [], options = {}) {
    try {
      const uploadPromises = files.map((file, index) => {
        const publicId = publicIds[index] || null;
        return this.uploadImage(file, publicId, options);
      });

      const results = await Promise.all(uploadPromises);
      console.log(`✅ ${results.length} images uploaded successfully`);

      return results;
    } catch (error) {
      console.error("❌ Multiple images upload error:", error);
      throw new Error(`Failed to upload multiple images: ${error.message}`);
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param {string} publicId - Public ID of the image to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === "ok") {
        console.log(`✅ Image deleted successfully: ${publicId}`);
        return { success: true, message: "Image deleted successfully" };
      } else {
        throw new Error(`Failed to delete image: ${result.result}`);
      }
    } catch (error) {
      console.error("❌ Cloudinary delete error:", error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Delete multiple images from Cloudinary
   * @param {Array} publicIds - Array of public IDs to delete
   * @returns {Promise<Array>} Array of deletion results
   */
  async deleteMultipleImages(publicIds) {
    try {
      const deletePromises = publicIds.map((publicId) =>
        this.deleteImage(publicId),
      );
      const results = await Promise.all(deletePromises);

      console.log(`✅ ${results.length} images deleted successfully`);
      return results;
    } catch (error) {
      console.error("❌ Multiple images delete error:", error);
      throw new Error(`Failed to delete multiple images: ${error.message}`);
    }
  }

  /**
   * Generate a signed upload preset for client-side uploads
   * @param {Object} options - Upload options
   * @returns {Object} Upload preset configuration
   */
  generateUploadPreset(options = {}) {
    const presetOptions = {
      folder: this.folder,
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
      ...options,
    };

    return {
      cloud_name: cloudinary.config().cloud_name,
      upload_preset: "grup_upload_preset", // You'll need to create this in Cloudinary dashboard
      folder: this.folder,
      options: presetOptions,
    };
  }

  /**
   * Get image URL with transformations
   * @param {string} publicId - Public ID of the image
   * @param {Object} transformations - Cloudinary transformations
   * @returns {string} Transformed image URL
   */
  getImageUrl(publicId, transformations = {}) {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations,
    });
  }

  /**
   * Get environment information
   * @returns {Object} Environment details
   */
  getEnvironmentInfo() {
    return {
      cloud_name: cloudinary.config().cloud_name,
      folder: this.folder,
      environment: process.env.NODE_ENV || "development",
    };
  }
}

// Create singleton instance
const cloudinaryService = new CloudinaryService();

export default cloudinaryService;
