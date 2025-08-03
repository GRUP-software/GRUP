import mongoose from "mongoose"
import logger from "../utils/logger.js"

export const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/grup"

    const conn = await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
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
      collections: Object.keys(mongoose.connection.collections).length,
    }
  } catch (error) {
    logger.error("Database health check failed:", error)
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

    if (collections.products) {
      await collections.products.createIndex({ name: "text", description: "text" })
      await collections.products.createIndex({ category: 1 })
      await collections.products.createIndex({ status: 1 })
      await collections.products.createIndex({ createdAt: -1 })
    }

    if (collections.orders) {
      await collections.orders.createIndex({ userId: 1 })
      await collections.orders.createIndex({ status: 1 })
      await collections.orders.createIndex({ createdAt: -1 })
    }

    if (collections.grouppurchases) {
      await collections.grouppurchases.createIndex({ productId: 1 })
      await collections.grouppurchases.createIndex({ status: 1 })
      await collections.grouppurchases.createIndex({ expiresAt: 1 })
    }

    if (collections.users) {
      await collections.users.createIndex({ email: 1 }, { unique: true })
      await collections.users.createIndex({ phone: 1 })
    }

    logger.info("Database indexes created successfully")
  } catch (error) {
    logger.error("Error creating database indexes:", error)
  }
}
