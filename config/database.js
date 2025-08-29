import mongoose from "mongoose"
import logger from "../utils/logger.js"

export const connectDatabase = async () => {
  try {
    // Use MONGODB_URI consistently, fallback to MONGO_URI for backward compatibility
    let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/GRUP';
    
    // Log connection attempt (without sensitive info)
    logger.info(`Attempting to connect to MongoDB...`)
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    logger.info(`Connection Type: ${mongoUri.includes('localhost') ? 'Local' : 'External'}`)
    
    // Clean up the MongoDB URI - remove any deprecated options from the connection string
    if (mongoUri.includes('sslValidate')) {
      logger.warn('Removing deprecated sslValidate from connection string')
      mongoUri = mongoUri.replace(/[?&]sslValidate=[^&]*/g, '')
    }
    
    // Base connection options
    const connectionOptions = {
      maxPoolSize: process.env.NODE_ENV === 'production' ? 50 : 10,
      minPoolSize: process.env.NODE_ENV === 'production' ? 5 : 1,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    };

    // Add production-specific options only for external MongoDB (not localhost)
    if (process.env.NODE_ENV === 'production' && !mongoUri.includes('localhost')) {
      // Modern MongoDB connection options for external servers
      Object.assign(connectionOptions, {
        ssl: true,
        retryWrites: true,
        w: 'majority',
      });
      logger.info('Using SSL connection for production MongoDB')
    } else {
      // Local MongoDB connection options
      logger.info('Using local MongoDB connection')
    }

    logger.info('Connection options:', JSON.stringify(connectionOptions, null, 2))

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
    
    // Additional debugging info
    if (error.message.includes('sslvalidate')) {
      logger.error("SSL validation error detected. This might be due to deprecated connection options.")
      logger.error("Please check your MONGODB_URI environment variable for deprecated options.")
    }
    
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
