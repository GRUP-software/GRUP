import mongoose from "mongoose"
import DeliveryZone from "../models/DeliveryZone.js"
import dotenv from "dotenv"

dotenv.config()

const seedDeliveryZones = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    // Clear existing zones
    await DeliveryZone.deleteMany({})

    // Seed default delivery zones for Lagos, Nigeria
    const zones = [
      {
        name: "Lagos Island",
        coordinates: [
          { lat: 6.4541, lng: 3.3947 },
          { lat: 6.4541, lng: 3.4247 },
          { lat: 6.4341, lng: 3.4247 },
          { lat: 6.4341, lng: 3.3947 },
        ],
        baseDeliveryFee: 1000,
        pricePerKm: 100,
        maxDeliveryDistance: 30,
        estimatedDeliveryTime: 24,
      },
      {
        name: "Victoria Island",
        coordinates: [
          { lat: 6.4281, lng: 3.4219 },
          { lat: 6.4281, lng: 3.4419 },
          { lat: 6.4181, lng: 3.4419 },
          { lat: 6.4181, lng: 3.4219 },
        ],
        baseDeliveryFee: 1200,
        pricePerKm: 120,
        maxDeliveryDistance: 35,
        estimatedDeliveryTime: 24,
      },
      {
        name: "Mainland Lagos",
        coordinates: [
          { lat: 6.5, lng: 3.35 },
          { lat: 6.5, lng: 3.4 },
          { lat: 6.45, lng: 3.4 },
          { lat: 6.45, lng: 3.35 },
        ],
        baseDeliveryFee: 1500,
        pricePerKm: 80,
        maxDeliveryDistance: 50,
        estimatedDeliveryTime: 48,
      },
    ]

    await DeliveryZone.insertMany(zones)
    console.log("Delivery zones seeded successfully")

    process.exit(0)
  } catch (err) {
    console.error("Error seeding delivery zones:", err)
    process.exit(1)
  }
}

seedDeliveryZones()
