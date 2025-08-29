import helmet from "helmet"
import mongoSanitize from "express-mongo-sanitize"
import xss from "xss-clean"
import hpp from "hpp"

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    // Always allow requests with no origin (direct browser access, file:// URLs, mobile apps, Postman, etc.)
    if (!origin || origin === 'null') {
      console.log('Allowing request with no origin (direct access, mobile apps, Postman, etc.)');
      return callback(null, true);
    }

    // Allow all origins in development
    if (process.env.NODE_ENV === "development") {
      console.log(`Development mode: allowing origin: ${origin}`);
      return callback(null, true);
    }

    // Define allowed origins for production
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://grup.com.ng',
      'https://www.grup.com.ng',
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ].filter(Boolean);

    // Production: Check if origin is in allowed list
    if (process.env.NODE_ENV === "production") {
      // Check exact match first
      if (allowedOrigins.includes(origin)) {
        console.log(`Production: allowing origin: ${origin}`);
        return callback(null, true);
      }
      
      // Check if origin starts with any allowed domain (for subdomains)
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.startsWith('http://') || allowedOrigin.startsWith('https://')) {
          const allowedDomain = allowedOrigin.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const requestDomain = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');
          return requestDomain === allowedDomain || requestDomain.endsWith('.' + allowedDomain);
        }
        return false;
      });

      if (isAllowed) {
        console.log(`Production: allowing origin: ${origin} (subdomain match)`);
        return callback(null, true);
      }

      console.warn(`Blocked request from unauthorized origin: ${origin}`);
      console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'));
    } else {
      // Development/Staging: Allow all origins
      console.log(`Non-production: allowing origin: ${origin}`);
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Cache-Control",
    "X-File-Name",
    "X-Forwarded-For",
    "X-Real-IP",
    "User-Agent",
    "Referer",
  ],
  exposedHeaders: ["set-cookie", "x-auth-token"],
  preflightContinue: false,
  optionsSuccessStatus: 200,
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
