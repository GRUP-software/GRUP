import mongoose from "mongoose"
import logger from "../utils/logger.js"

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Removed deprecated options: useNewUrlParser and useUnifiedTopology
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    logger.info(`MongoDB Connected: ${conn.connection.host}`)
    return conn
  } catch (error) {
    logger.error("Database connection error:", error)
    process.exit(1)
  }
}

export const checkDatabaseHealth = async () => {
  try {
    const state = mongoose.connection.readyState
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    }

    return {
      status: states[state] || "unknown",
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    }
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    }
  }
}

export const createIndexes = async () => {
  try {
    // Create indexes for better performance
    const collections = mongoose.connection.collections

    // Product indexes
    if (collections.products) {
      await collections.products.createIndex({ name: "text", description: "text" })
      await collections.products.createIndex({ category: 1 })
      await collections.products.createIndex({ price: 1 })
      await collections.products.createIndex({ createdAt: -1 })
    }

    // User indexes
    if (collections.users) {
      await collections.users.createIndex({ email: 1 }, { unique: true })
      await collections.users.createIndex({ phone: 1 })
    }

    // Order indexes
    if (collections.orders) {
      await collections.orders.createIndex({ userId: 1 })
      await collections.orders.createIndex({ status: 1 })
      await collections.orders.createIndex({ createdAt: -1 })
    }

    // Group purchase indexes
    if (collections.grouppurchases) {
      await collections.grouppurchases.createIndex({ productId: 1 })
      await collections.grouppurchases.createIndex({ status: 1 })
      await collections.grouppurchases.createIndex({ expiresAt: 1 })
    }

    logger.info("Database indexes created successfully")
  } catch (error) {
    logger.error("Error creating database indexes:", error)
  }
}
