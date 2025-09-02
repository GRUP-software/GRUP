import mongoose from 'mongoose';

const { Schema } = mongoose;

const uploadedImageSchema = new Schema(
    {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        mimetype: { type: String, required: true },
        uploadedBy: { type: String, default: 'admin' },
        isUsed: { type: Boolean, default: false },
        usedInProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        tags: [String], // For categorizing images
        description: String,
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
uploadedImageSchema.index({ createdAt: -1 });
uploadedImageSchema.index({ isUsed: 1 });
uploadedImageSchema.index({ tags: 1 });

const UploadedImage = mongoose.model('UploadedImage', uploadedImageSchema);
export default UploadedImage;
