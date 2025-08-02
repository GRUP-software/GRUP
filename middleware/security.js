import helmet from "helmet"
import hpp from "hpp"
import xss from "xss-clean"
import mongoSanitize from "express-mongo-sanitize"

// Export individual middleware functions
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"], // This allows inline event handlers
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
})

const hppMiddleware = hpp() // Prevent HTTP Parameter Pollution
const xssMiddleware = xss() // Clean user input from malicious HTML
const mongoSanitizeMiddleware = mongoSanitize() // Prevent NoSQL injection attacks

// Combined security middleware function
export const securityMiddleware = (req, res, next) => {
  // Apply all security middleware in sequence
  helmetMiddleware(req, res, (err) => {
    if (err) return next(err)
    hppMiddleware(req, res, (err) => {
      if (err) return next(err)
      xssMiddleware(req, res, (err) => {
        if (err) return next(err)
        mongoSanitizeMiddleware(req, res, next)
      })
    })
  })
}

export const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL || "https://your-production-domain.com"]
      : ["http://localhost:3000", "http://localhost:3001", "http://localhost:4000", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}
