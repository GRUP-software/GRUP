import mongoose from 'mongoose';

const shoppingRegionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, lowercase: true },
        displayName: { type: String, required: true },
        state: { type: String, required: true },
        // Removed coordinates as per request
        // coordinates: {
        //   type: { type: String, enum: ["Point"], default: "Point" },
        //   coordinates: { type: [Number], required: true }, // [longitude, latitude]
        // },
        features: {
            sameDay: { type: Boolean, default: false },
            cashOnDelivery: { type: Boolean, default: true },
            groupBuying: { type: Boolean, default: true },
        },
        isActive: { type: Boolean, default: true },
        priority: { type: Number, default: 0 }, // Higher number means higher priority for display/selection
    },
    { timestamps: true }
);

// Create a 2dsphere index for geospatial queries if coordinates were present
// shoppingRegionSchema.index({ coordinates: "2dsphere" });

const ShoppingRegion = mongoose.model('ShoppingRegion', shoppingRegionSchema);

export default ShoppingRegion;
