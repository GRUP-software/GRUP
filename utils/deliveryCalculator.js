import DeliveryZone from "../models/DeliveryZone.js"
// import { calculateDistance } from "./openStreetMapService.js"

// Calculate delivery fee based on coordinates
export const calculateDeliveryFee = async (coordinates) => {
  try {
    const { lat, lng } = coordinates

    // Default delivery fee if no zones configured
    const defaultFee = 1500 // 1500 naira

    // Find applicable delivery zone (simplified - you might want more complex polygon checking)
    const zones = await DeliveryZone.find({ isActive: true })

    if (zones.length === 0) {
      return defaultFee
    }

    // For now, use a simple distance-based calculation
    // In production, you'd use proper geospatial queries
    const baseZone = zones[0] // Use first active zone as base
    const baseDistance = 10 // km
    const distance = calculateDistance(lat, lng, 6.5244, 3.3792) // Lagos coordinates as reference

    const deliveryFee = baseZone.baseDeliveryFee + Math.max(0, distance - baseDistance) * baseZone.pricePerKm

    return Math.round(deliveryFee)
  } catch (err) {
    console.error("Delivery fee calculation error:", err)
    return 1500 // Default fee
  }
}

// Export both named and default
export default calculateDeliveryFee
