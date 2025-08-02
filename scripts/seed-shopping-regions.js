import mongoose from "mongoose"
import ShoppingRegion from "../models/ShoppingRegion.js"
import dotenv from "dotenv"

dotenv.config()

const seedShoppingRegions = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    
    await ShoppingRegion.deleteMany({})

    
    const regions = [
      {
        name: "lagos",
        displayName: "Lagos",
        state: "Lagos State",
        coordinates: { lat: 6.5244, lng: 3.3792 },
        priority: 10,
        businessHours: {
          monday: { open: "08:00", close: "20:00" },
          tuesday: { open: "08:00", close: "20:00" },
          wednesday: { open: "08:00", close: "20:00" },
          thursday: { open: "08:00", close: "20:00" },
          friday: { open: "08:00", close: "20:00" },
          saturday: { open: "09:00", close: "18:00" },
          sunday: { open: "10:00", close: "16:00" },
        },
        features: {
          sameDay: true,
          nextDay: true,
          groupBuying: true,
          cashOnDelivery: false,
        },
      },
      {
        name: "abuja",
        displayName: "Abuja",
        state: "Federal Capital Territory",
        coordinates: { lat: 9.0765, lng: 7.3986 },
        priority: 9,
        businessHours: {
          monday: { open: "08:00", close: "19:00" },
          tuesday: { open: "08:00", close: "19:00" },
          wednesday: { open: "08:00", close: "19:00" },
          thursday: { open: "08:00", close: "19:00" },
          friday: { open: "08:00", close: "19:00" },
          saturday: { open: "09:00", close: "17:00" },
          sunday: { open: "10:00", close: "15:00" },
        },
        features: {
          sameDay: false,
          nextDay: true,
          groupBuying: true,
          cashOnDelivery: true,
        },
      },
      {
        name: "port-harcourt",
        displayName: "Port Harcourt",
        state: "Rivers State",
        coordinates: { lat: 4.8156, lng: 7.0498 },
        priority: 8,
        businessHours: {
          monday: { open: "08:00", close: "19:00" },
          tuesday: { open: "08:00", close: "19:00" },
          wednesday: { open: "08:00", close: "19:00" },
          thursday: { open: "08:00", close: "19:00" },
          friday: { open: "08:00", close: "19:00" },
          saturday: { open: "09:00", close: "17:00" },
          sunday: { open: "10:00", close: "15:00" },
        },
        features: {
          sameDay: false,
          nextDay: true,
          groupBuying: true,
          cashOnDelivery: true,
        },
      },
      {
        name: "ibadan",
        displayName: "Ibadan",
        state: "Oyo State",
        coordinates: { lat: 7.3775, lng: 3.947 },
        priority: 7,
        businessHours: {
          monday: { open: "08:00", close: "19:00" },
          tuesday: { open: "08:00", close: "19:00" },
          wednesday: { open: "08:00", close: "19:00" },
          thursday: { open: "08:00", close: "19:00" },
          friday: { open: "08:00", close: "19:00" },
          saturday: { open: "09:00", close: "17:00" },
          sunday: { open: "10:00", close: "15:00" },
        },
        features: {
          sameDay: false,
          nextDay: true,
          groupBuying: true,
          cashOnDelivery: true,
        },
      },
      {
        name: "kano",
        displayName: "Kano",
        state: "Kano State",
        coordinates: { lat: 12.0022, lng: 8.592 },
        priority: 6,
        features: {
          sameDay: false,
          nextDay: true,
          groupBuying: true,
          cashOnDelivery: true,
        },
      },
    ]

    await ShoppingRegion.insertMany(regions)
    console.log(" Shopping regions seeded successfully")

    process.exit(0)
  } catch (err) {
    console.error("Error seeding shopping regions:", err)
    process.exit(1)
  }
}

seedShoppingRegions()
