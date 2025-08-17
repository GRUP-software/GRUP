// server.mjs
import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import compression from 'compression';

// Load environment variables first
dotenv.config();

// Import configurations and middleware
import { connectDatabase, checkDatabaseHealth, createIndexes } from './config/database.js';
import { securityMiddleware, corsOptions } from './middleware/security.js';
import { globalErrorHandler, handleUnhandledRejection, handleUncaughtException } from './utils/errorHandler.js';
import logger from './utils/logger.js';

// Import admin panel EARLY (before other routes)
import { adminRouter } from './admin.mjs';

// Import routes
import groupRoutes from './routes/groupBuyRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cartRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import liveUserRoutes from './routes/liveUserRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import referralRoutes from './routes/referralRoutes.js';

// Import NEW routes
import webhookRoutes from './routes/webhookRoutes.js';
// REMOVED DUPLICATE: import groupBuyRoutes from './routes/groupBuyRoutes.js';

// Import controllers
import { userDisconnected, getLiveUserCountUtil } from './controllers/liveUserController.js';

// Import jobs
import { startGroupBuyExpiryJob } from './jobs/groupBuyExpiry.js';

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Make io globally available for WebSocket events
global.io = io;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Compression middleware
app.use(compression());

// CORS middleware - Apply BEFORE security middleware for admin panel
app.use(cors(corsOptions));

// Add explicit OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Special CORS handling for admin routes
app.use('/admin', (req, res, next) => {
  // Set CORS headers explicitly for admin routes
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Security middleware - apply after CORS
app.use(securityMiddleware);

// Add CORS debugging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    console.log('Admin Request - Origin:', req.headers.origin || 'no-origin');
    console.log('Admin Request - Method:', req.method);
    console.log('Admin Request - Path:', req.path);
  }
  next();
});

// __dirname support for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRITICAL FIX: Serve uploaded images with proper CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for all image requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  res.header('Access-Control-Max-Age', '3600');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Log the request for debugging
  console.log(`Image request: ${req.method} ${req.url} from origin: ${req.headers.origin || 'no-origin'}`);
  
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  // Additional static file options
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path, stat) => {
    // Ensure CORS headers are set on the response
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
}));

// Serve React frontend build files (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'zahara-frontend-main', 'dist')));
}

// Explicit route for admin upload tool
app.get('/admin-upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-upload.html'));
});

// AdminJS setup MUST come BEFORE body parser
app.use('/admin', adminRouter);

// ✅ NOW we can add body parsing middleware AFTER AdminJS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

app.use('/api', (req, res, next) => {
  console.log(`[v0] API Request: ${req.method} ${req.path}`);
  console.log(`[v0] Full URL: ${req.originalUrl}`);
  console.log(`[v0] Headers:`, req.headers);
  next();
});

// API routes - NO RATE LIMITING
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/group', groupRoutes); // Keep only one registration
app.use('/api/cart', cartRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/live-users', liveUserRoutes);
app.use('/api/referral', referralRoutes);

// NEW API routes
app.use('/api/webhook', webhookRoutes);
// REMOVED DUPLICATE: app.use('/api/groupbuy', groupBuyRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('user_online', (userId) => {
    socket.userId = userId;
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined room`);
  });

  socket.on('join_product_room', (productId) => {
    socket.join(`product_${productId}`);
    logger.info(`Socket ${socket.id} joined product room: ${productId}`);
  });

  socket.on('join_groupbuy_room', (groupBuyId) => {
    socket.join(`groupbuy_${groupBuyId}`);
    logger.info(`Socket ${socket.id} joined group buy room: ${groupBuyId}`);
  });

  socket.on('disconnect', async () => {
    logger.info(`User disconnected: ${socket.id}`);
    await userDisconnected(socket.id);
    
    // Broadcast updated live user count
    try {
      const count = await getLiveUserCountUtil();
      io.emit('live_user_count', { liveUsers: count });
    } catch (error) {
      logger.error('Error broadcasting live user count:', error);
    }
  });
});

// Make io available to routes
app.set('io', io);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Image test endpoint to verify CORS
app.get('/api/test-image/:filename', (req, res) => {
  const { filename } = req.params;
  const imagePath = path.join(__dirname, 'uploads', filename);
  
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Image not found' });
    }
  });
});

// Basic API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Grup Backend API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      admin: '/admin',
      uploadTool: '/admin-upload.html',
      api: '/api/*',
      health: '/health',
      newEndpoints: {
        webhook: '/api/webhook',
        groupBuy: '/api/groupbuy'
      }
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Grup Backend Server',
    version: process.env.npm_package_version || '1.0.0',
    status: 'Running',
    environment: process.env.NODE_ENV || 'development',
    links: {
      admin: '/admin',
      uploadTool: '/admin-upload.html',
      apiStatus: '/api/status',
      health: '/health'
    }
  });
});

// 404 handler for undefined API routes
app.get('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API route not found',
    message: 'This API endpoint does not exist',
    availableRoutes: {
      admin: '/admin',
      uploadTool: '/admin-upload.html',
      api: '/api/status',
      health: '/health',
      webhook: '/api/webhook',
      groupBuy: '/api/groupbuy'
    }
  });
});

// Catch-all handler for React Router (must be after API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve React app for API routes or admin routes
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/uploads')) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.sendFile(path.join(__dirname, 'zahara-frontend-main', 'dist', 'index.html'));
  });
}

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Create database indexes
    await createIndexes();
    
    // Start group buy expiry job
    startGroupBuyExpiryJob();
    
    // Scheduled jobs
    cron.schedule('0 * * * *', async () => {
      try {
        const groupBuyExpiry = (await import('./jobs/groupBuyExpiry.js')).default;
        await groupBuyExpiry();
        logger.info('Group expiry job completed');
      } catch (error) {
        logger.error('Group expiry job failed:', error);
      }
    });

    // Broadcast live user count every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        const count = await getLiveUserCountUtil();
        io.emit('live_user_count', { liveUsers: count });
      } catch (error) {
        logger.error('Live user count broadcast failed:', error);
      }
    });

    // Update group progress every minute
    cron.schedule('* * * * *', async () => {
      try {
        const GroupBuy = (await import('./models/GroupBuy.js')).default;
        const activeGroups = await GroupBuy.find({ status: 'active' });
        
        for (const group of activeGroups) {
          // Check if group reached MVU and should be marked successful
          if (group.unitsSold >= group.minimumViableUnits && group.status === 'active') {
            group.status = 'successful';
            await group.save();
            
            // Notify participants via WebSocket
            io.to(`groupbuy_${group._id}`).emit('group_successful', {
              groupBuyId: group._id,
              productId: group.productId,
              message: 'Group buy reached minimum viable units and is now successful!'
            });
            
            logger.info(`Group buy ${group._id} marked as successful for product ${group.productId}`);
          }
        }
      } catch (error) {
        logger.error('Group progress update job failed:', error);
      }
    });

    // Start server with dynamic port selection
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      logger.info(`🚀 Grup Backend Server running at: http://localhost:${PORT}`);
      logger.info(`📊 Admin Panel: http://localhost:${PORT}/admin`);
      logger.info(`🖼️  Upload Tool: http://localhost:${PORT}/admin-upload.html`);
      logger.info(`📡 API Status: http://localhost:${PORT}/api/status`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info(`🔗 Webhook: http://localhost:${PORT}/api/webhook/paystack`);
      logger.info(`👥 Group Buy: http://localhost:${PORT}/api/groupbuy`);
      logger.info(`🔍 Manual Review: http://localhost:${PORT}/api/groupbuy/manual-review`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Trying port ${PORT + 1}...`);
        server.listen(PORT + 1, () => {
          logger.info(`🚀 Grup Backend Server running at: http://localhost:${PORT + 1}`);
          logger.info(`📊 Admin Panel: http://localhost:${PORT + 1}/admin`);
          logger.info(`🖼️  Upload Tool: http://localhost:${PORT + 1}/admin-upload.html`);
          logger.info(`📡 API Status: http://localhost:${PORT + 1}/api/status`);
          logger.info(`🏥 Health Check: http://localhost:${PORT + 1}/health`);
        });
      } else {
        logger.error('Failed to start server:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
