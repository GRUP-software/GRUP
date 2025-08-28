import mongoose from "mongoose"
import logger from "../utils/logger.js"

export const connectDatabase = async () => {
  try {
    // Use MONGODB_URI consistently, fallback to MONGO_URI for backward compatibility
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/GRUP';
    
    // Connection options based on environment
    const connectionOptions = {
      // Production-ready connection options
      maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
      minPoolSize: process.env.NODE_ENV === 'production' ? 5 : 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Add SSL options only for non-Docker MongoDB (like MongoDB Atlas)
    if (process.env.NODE_ENV === 'production' && !mongoUri.includes('mongo:') && !mongoUri.includes('localhost')) {
      connectionOptions.ssl = true;
      connectionOptions.sslValidate = true;
      connectionOptions.retryWrites = true;
      connectionOptions.w = 'majority';
    }

    const conn = await mongoose.connect(mongoUri, connectionOptions);

    logger.info(`MongoDB Connected: ${conn.connection.host}`)
    logger.info(`Database: ${conn.connection.name}`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`Connection Type: ${mongoUri.includes('mongo:') ? 'Docker' : 'External'}`)
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
    if (collections.groupbuys) {
      await collections.groupbuys.createIndex({ productId: 1 })
      await collections.groupbuys.createIndex({ status: 1 })
      await collections.groupbuys.createIndex({ expiresAt: 1 })
    }

    logger.info("Database indexes created successfully")
  } catch (error) {
    logger.error("Error creating database indexes:", error)
  }
}
