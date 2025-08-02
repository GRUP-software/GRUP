import logger from "./logger.js"

export const globalErrorHandler = (err, req, res, next) => {
  logger.error("Global error handler:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  })

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    })
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    })
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    })
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

export const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (err, promise) => {
    logger.error("Unhandled Promise Rejection:", err)
    process.exit(1)
  })
}

export const handleUncaughtException = () => {
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err)
    process.exit(1)
  })
}
