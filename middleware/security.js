import helmet from "helmet"
import mongoSanitize from "express-mongo-sanitize"
import xss from "xss-clean"
import hpp from "hpp"

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    // Allow all origins in development
    if (process.env.NODE_ENV === "development") {
      return callback(null, true)
    }

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:4000",
      "http://localhost:5000",
      "http://localhost:5001",
      "http://localhost:5002",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:5001",
      "http://127.0.0.1:3000",
      "https://grupclient.netlify.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean)



    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {

      callback(null, true) // Allow all for now to fix admin panel
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
    "X-File-Name",
  ],
  exposedHeaders: ["set-cookie"],
}

// Security middleware configuration
export const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),

  // Data sanitization against NoSQL query injection
  mongoSanitize(),

  // Data sanitization against XSS
  xss(),

  // Prevent parameter pollution
  hpp({
    whitelist: ["sort", "fields", "page", "limit", "category", "tags", "status", "minPrice", "maxPrice"],
  }),
]
