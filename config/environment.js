import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Server
  PORT: process.env.PORT || 5000,
  
  // Database - Use MONGODB_URI consistently
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/GRUP',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret-key-change-this-in-production',
  
  // Frontend URL
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://grupclient.netlify.app',
  
  // Cloudinary Configuration
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'dafkhnw7p',
    API_KEY: process.env.CLOUDINARY_API_KEY || '946915641663984',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || 'MU6_2U6tpzbJ-VbnqfQ-_OEQeWc',
    FOLDER: process.env.CLOUDINARY_FOLDER || 'grup'
  },
  
  // Flutterwave Configuration
  FLUTTERWAVE: {
    SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY || '',
    PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
    ENCRYPTION_KEY: process.env.FLUTTERWAVE_ENCRYPTION_KEY || ''
  },
  
  // Socket.IO
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Email Configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: process.env.EMAIL_PORT || 587,
    USER: process.env.EMAIL_USER || '',
    PASS: process.env.EMAIL_PASS || '',
    FROM_NAME: process.env.EMAIL_FROM_NAME || 'Grup Team'
  }
};

// Environment-specific configurations
const environmentConfigs = {
  development: {
    ...config,
    CLOUDINARY: {
      ...config.CLOUDINARY,
      FOLDER: `${config.CLOUDINARY.FOLDER}/development`
    },
    LOG_LEVEL: 'debug'
  },
  
  testing: {
    ...config,
    CLOUDINARY: {
      ...config.CLOUDINARY,
      FOLDER: `${config.CLOUDINARY.FOLDER}/testing`
    },
    LOG_LEVEL: 'warn'
  },
  
  staging: {
    ...config,
    CLOUDINARY: {
      ...config.CLOUDINARY,
      FOLDER: `${config.CLOUDINARY.FOLDER}/staging`
    },
    LOG_LEVEL: 'info'
  },
  
  production: {
    ...config,
    CLOUDINARY: {
      ...config.CLOUDINARY,
      FOLDER: `${config.CLOUDINARY.FOLDER}/production`
    },
    LOG_LEVEL: 'error',
    // Production-specific overrides
    PORT: process.env.PORT || 8080,
    JWT_SECRET: process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET must be set in production');
    })()
  }
};

// Get current environment configuration
const getCurrentConfig = () => {
  const env = config.NODE_ENV;
  return environmentConfigs[env] || environmentConfigs.development;
};

// Export current configuration
export default getCurrentConfig();

// Export all configurations for testing
export { environmentConfigs, getCurrentConfig };
