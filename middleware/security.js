import helmet from "helmet"
import mongoSanitize from "express-mongo-sanitize"
import xss from "xss-clean"
import hpp from "hpp"

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    // Always allow requests with no origin (direct browser access, file:// URLs, etc.)
    if (!origin) {
      console.log('Allowing request with no origin (direct access)');
      return callback(null, true);
    }

    // Allow all origins in development
    if (process.env.NODE_ENV === "development") {
      console.log(`Development mode: allowing origin: ${origin}`);
      return callback(null, true);
    }

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ].filter(Boolean);

    // Production: Only allow specific origins
    if (process.env.NODE_ENV === "production") {
      if (allowedOrigins.includes(origin)) {
        console.log(`Production: allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.warn(`Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development/Staging: Allow all origins
      console.log(`Non-production: allowing origin: ${origin}`);
      callback(null, true);
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
