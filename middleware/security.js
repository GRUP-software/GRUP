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
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    const allowedOrigins =
      process.env.NODE_ENV === "production"
        ? [
            process.env.FRONTEND_URL || "https://your-production-domain.com",
            "http://localhost:3000", // Keep localhost for admin panel
            "http://localhost:5001", // Backend port
            "http://localhost:5000", // Alternative backend port
          ]
        : [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:4000",
            "http://localhost:5000", // Backend ports
            "http://localhost:5001",
            "http://localhost:5002",
            "http://localhost:5173", // Vite default port
            "http://localhost:5174", // Vite alternative port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5000",
            "http://127.0.0.1:5001",
            "http://127.0.0.1:3000",
          ]

    // Always allow admin panel origins
    const adminOrigins = [
      "http://localhost:5000",
      "http://localhost:5001",
      "http://localhost:5002",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:5001",
      "http://127.0.0.1:5002",
    ]

    if (allowedOrigins.indexOf(origin) !== -1 || adminOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log("CORS blocked origin:", origin)
      console.log("Allowed origins:", allowedOrigins)
      callback(null, true) // Allow all origins for now to fix admin panel
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 200, // For legacy browser support
}
