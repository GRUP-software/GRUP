import mongoose from "mongoose"
import logger from "../utils/logger.js"

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    logger.info(`MongoDB Connected: ${conn.connection.host}`)
    return conn
  } catch (error) {
    logger.error("Database connection failed:", error)
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
    return { status: "error", error: error.message }
  }
}

export const createIndexes = async () => {
  try {
    const User = (await import("../models/User.js")).default
    const Product = (await import("../models/Product.js")).default
    const Order = (await import("../models/order.js")).default
    const GroupPurchase = (await import("../models/GroupPurchase.js")).default

    await User.createIndexes()
    await Product.createIndexes()
    await Order.createIndexes()
    await GroupPurchase.createIndexes()

    logger.info("Database indexes created successfully")
  } catch (error) {
    logger.error("Error creating indexes:", error)
  }
}
