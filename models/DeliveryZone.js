import mongoose from "mongoose"

const { Schema } = mongoose

const deliveryZoneSchema = new Schema(
  {
    name: { type: String, required: true },
    coordinates: [
      {
        lat: Number,
        lng: Number,
      },
    ], // Polygon coordinates for the zone
    baseDeliveryFee: { type: Number, required: true },
    pricePerKm: { type: Number, required: true },
    maxDeliveryDistance: { type: Number, default: 50 }, // km
    estimatedDeliveryTime: { type: Number, default: 24 }, // hours
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
)

const DeliveryZone = mongoose.model("DeliveryZone", deliveryZoneSchema)
export default DeliveryZone
