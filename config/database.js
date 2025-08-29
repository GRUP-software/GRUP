import mongoose from "mongoose"
import logger from "../utils/logger.js"

export const connectDatabase = async () => {
  try {
    // Use MONGODB_URI consistently, fallback to MONGO_URI for backward compatibility
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/GRUP';
    
    // Log connection attempt (without sensitive info)
    logger.info(`Attempting to connect to MongoDB...`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`Connection Type: ${mongoUri.includes('localhost') ? 'Local' : 'External'}`)
    
    // Connection options based on environment
    const connectionOptions = {
      // Development-friendly connection options
      maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
      minPoolSize: process.env.NODE_ENV === 'production' ? 5 : 1,
      serverSelectionTimeoutMS: 30000, // Increased timeout for better reliability
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
    };

    // Add SSL options only for production MongoDB Atlas
    if (process.env.NODE_ENV === 'production' && !mongoUri.includes('localhost')) {
      connectionOptions.ssl = true;
      connectionOptions.retryWrites = true;
      connectionOptions.w = 'majority';
      logger.info('Using SSL connection for production MongoDB Atlas')
    }

    const conn = await mongoose.connect(mongoUri, connectionOptions);

    logger.info(`MongoDB Connected: ${conn.connection.host}`)
    logger.info(`Database: ${conn.connection.name}`)
    logger.info(`Connection successful!`)
    return conn
  } catch (error) {
    logger.error("Database connection error:", error)
    logger.error("Error details:", {
      name: error.name,
      message: error.message,
      code: error.code
    })
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
