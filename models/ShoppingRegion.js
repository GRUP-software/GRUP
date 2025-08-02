import mongoose from "mongoose"

const { Schema } = mongoose

const shoppingRegionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    state: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    deliveryZones: [{ type: Schema.Types.ObjectId, ref: "DeliveryZone" }],
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 }, // For ordering in UI

    // Regional settings
    currency: { type: String, default: "NGN" },
    taxRate: { type: Number, default: 0.075 }, // 7.5% VAT in Nigeria

    // Business hours
    businessHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },

    // Regional features
    features: {
      sameDay: { type: Boolean, default: false },
      nextDay: { type: Boolean, default: true },
      groupBuying: { type: Boolean, default: true },
      cashOnDelivery: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  },
)

// Index for geospatial queries
shoppingRegionSchema.index({ coordinates: "2dsphere" })

const ShoppingRegion = mongoose.model("ShoppingRegion", shoppingRegionSchema)
export default ShoppingRegion
