import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Debug: Log where we're looking for .env file
console.log('🔍 .env file search debug:');
console.log('  Current directory:', __dirname);
console.log('  Looking for .env in:', path.resolve(__dirname, '..'));
console.log('  Looking for .env in:', path.resolve(__dirname, '../..'));

// Load environment variables
const result = dotenv.config();
console.log('  dotenv.config() result:', result);

// Log all environment variables that start with FLUTTERWAVE
console.log('🔍 Flutterwave environment variables:');
Object.keys(process.env).forEach((key) => {
    if (key.includes('FLUTTERWAVE')) {
        console.log(`  ${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
    }
});

const config = {
    // Environment
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Server
    PORT: process.env.PORT || 5000,

    // Database - Use MONGODB_URI consistently
    MONGODB_URI:
        process.env.MONGODB_URI ||
        process.env.MONGO_URI ||
        'mongodb://localhost:27017/GRUP',

    // JWT
    JWT_SECRET:
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-this-in-production',

    // Session
    SESSION_SECRET:
        process.env.SESSION_SECRET ||
        'your-session-secret-key-change-this-in-production',

    // Frontend URL
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://grupclient.netlify.app',

    // Cloudinary Configuration
    CLOUDINARY: {
        CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'dafkhnw7p',
        API_KEY: process.env.CLOUDINARY_API_KEY || '946915641663984',
        API_SECRET:
            process.env.CLOUDINARY_API_SECRET || 'MU6_2U6tpzbJ-VbnqfQ-_OEQeWc',
        FOLDER: process.env.CLOUDINARY_FOLDER || 'grup',
    },

    // Flutterwave Configuration
    FLUTTERWAVE: {
        SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY || '',
        PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
        ENCRYPTION_KEY: process.env.FLUTTERWAVE_ENCRYPTION_KEY || '',
    },

    // Socket.IO
    SOCKET_CORS_ORIGIN:
        process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // Email Configuration
    EMAIL: {
        HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
        PORT: process.env.EMAIL_PORT || 587,
        USER: process.env.EMAIL_USER || '',
        PASS: process.env.EMAIL_PASS || '',
        FROM_NAME: process.env.EMAIL_FROM_NAME || 'Grup Team',
    },
};

// Environment-specific configurations
const environmentConfigs = {
    development: {
        ...config,
        CLOUDINARY: {
            ...config.CLOUDINARY,
            FOLDER: `${config.CLOUDINARY.FOLDER}/development`,
        },
        LOG_LEVEL: 'debug',
    },

    testing: {
        ...config,
        CLOUDINARY: {
            ...config.CLOUDINARY,
            FOLDER: `${config.CLOUDINARY.FOLDER}/testing`,
        },
        LOG_LEVEL: 'warn',
    },

    staging: {
        ...config,
        CLOUDINARY: {
            ...config.CLOUDINARY,
            FOLDER: `${config.CLOUDINARY.FOLDER}/staging`,
        },
        LOG_LEVEL: 'info',
    },

    production: {
        ...config,
        CLOUDINARY: {
            ...config.CLOUDINARY,
            FOLDER: `${config.CLOUDINARY.FOLDER}/production`,
        },
        LOG_LEVEL: 'error',
        // Production-specific overrides
        PORT: process.env.PORT || 8080,
        JWT_SECRET:
            process.env.JWT_SECRET ||
            (() => {
                throw new Error('JWT_SECRET must be set in production');
            })(),
    },
};

// Get current environment configuration
const getCurrentConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    return environmentConfigs[env] || environmentConfigs.development;
};

// Export current configuration
const finalConfig = getCurrentConfig();

// Debug logging
console.log('🔍 Environment Configuration Debug:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log(
    '  FLUTTERWAVE_SECRET_KEY exists:',
    !!process.env.FLUTTERWAVE_SECRET_KEY
);
console.log(
    '  FLUTTERWAVE_SECRET_KEY length:',
    process.env.FLUTTERWAVE_SECRET_KEY
        ? process.env.FLUTTERWAVE_SECRET_KEY.length
        : 0
);
console.log(
    '  FLUTTERWAVE_ENCRYPTION_KEY exists:',
    !!process.env.FLUTTERWAVE_ENCRYPTION_KEY
);
console.log(
    '  FLUTTERWAVE_ENCRYPTION_KEY length:',
    process.env.FLUTTERWAVE_ENCRYPTION_KEY
        ? process.env.FLUTTERWAVE_ENCRYPTION_KEY.length
        : 0
);
console.log(
    '  Final config FLUTTERWAVE.SECRET_KEY exists:',
    !!finalConfig.FLUTTERWAVE?.SECRET_KEY
);
console.log(
    '  Final config FLUTTERWAVE.ENCRYPTION_KEY exists:',
    !!finalConfig.FLUTTERWAVE?.ENCRYPTION_KEY
);
console.log('  Final config keys:', Object.keys(finalConfig));

export default finalConfig;

// Export all configurations for testing
export { environmentConfigs, getCurrentConfig };
