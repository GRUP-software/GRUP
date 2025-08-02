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
import { apiLimiter, authLimiter, paymentLimiter, uploadLimiter, adminLimiter } from './middleware/rateLimiter.js';
import { globalErrorHandler, handleUnhandledRejection, handleUncaughtException } from './utils/errorHandler.js';
import logger from './utils/logger.js';

// Import admin panel EARLY (before other routes)
import { adminRouter } from './admin.mjs';

// Import routes
import groupRoutes from './routes/groupRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cartRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import liveUserRoutes from './routes/liveUserRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';

// Import controllers
import { userDisconnected, getLiveUserCountUtil } from './controllers/liveUserController.js';

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Compression middleware
app.use(compression());

// Security middleware - apply individually
app.use(securityMiddleware);

// CORS middleware
app.use(cors(corsOptions));

// Add explicit OPTIONS handling for preflight requests
app.options('*', cors(corsOptions));

// Add CORS debugging middleware
app.use((req, res, next) => {
  console.log('Request Origin:', req.headers.origin);
  console.log('Request Method:', req.method);
  console.log('Request Headers:', req.headers);
  next();
});

// __dirname support for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve React frontend build files (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'zahara-frontend-main', 'dist')));
}

// Explicit route for admin upload tool
app.get('/admin-upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-upload.html'));
});

// ⚠️ CRITICAL: AdminJS setup MUST come BEFORE body parser
// Admin panel (with admin rate limiting) - MOVED UP
app.use('/admin', adminLimiter, adminRouter);

// ✅ NOW we can add body parsing middleware AFTER AdminJS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

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

// API routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/payment', paymentLimiter, paymentRoutes);
app.use('/api/admin', uploadLimiter, adminRoutes);
app.use('/api/admin-auth', authLimiter, adminAuthRoutes);

// Regular API routes
app.use('/api/products', apiLimiter, productRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/group', apiLimiter, groupRoutes);
app.use('/api/cart', apiLimiter, cartRoutes);
app.use('/api/wallet', apiLimiter, walletRoutes);
app.use('/api/live-users', apiLimiter, liveUserRoutes);
app.use('/api/delivery', apiLimiter, deliveryRoutes);

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
      health: '/health'
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
      health: '/health'
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
    
    // Scheduled jobs
    cron.schedule('0 * * * *', async () => {
      try {
        const expireGroups = (await import('./jobs/expireGroups.js')).default;
        await expireGroups();
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
        const GroupPurchase = (await import('./models/GroupPurchase.js')).default;
        const activeGroups = await GroupPurchase.find({ status: 'forming' });
        
        for (const group of activeGroups) {
          const wasForming = group.status === 'forming';
          group.updateProgress();
          await group.save();
          
          // Notify if group was just secured
          if (wasForming && group.status === 'secured') {
            io.to(`product_${group.productId}`).emit('group_secured', {
              productId: group.productId,
              groupId: group._id,
              message: 'Group purchase secured!'
            });
            logger.info(`Group ${group._id} secured for product ${group.productId}`);
          }
        }
      } catch (error) {
        logger.error('Group progress update job failed:', error);
      }
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`🚀 Grup Backend Server running at: http://localhost:${PORT}`);
      logger.info(`📊 Admin Panel: http://localhost:${PORT}/admin`);
      logger.info(`🖼️  Upload Tool: http://localhost:${PORT}/admin-upload.html`);
      logger.info(`📡 API Status: http://localhost:${PORT}/api/status`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
