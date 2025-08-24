import express from "express"
import upload from "../middleware/upload.js"
import { verifyAdminToken } from "./adminAuthRoutes.js"
import UploadedImage from "../models/uploadedImage.js"
import Order from "../models/order.js"
import User from "../models/User.js"
import notificationService from "../services/notificationService.js"
import logger from "../utils/logger.js"

const router = express.Router()

// Admin login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Check admin credentials
    if (email === "adiazi@grup.com" && password === "12345678") {
      // Generate a simple admin token (in production, use proper JWT)
      const adminToken = Buffer.from(`${email}:${password}:admin:${Date.now()}`).toString("base64")

      res.json({
        success: true,
        token: adminToken,
        message: "Admin login successful",
        user: {
          email: email,
          role: "admin",
        },
      })
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      })
    }
  } catch (error) {
    console.error("Admin login error:", error)
    res.status(500).json({
      success: false,
      message: "Admin login failed",
      error: error.message,
    })
  }
})

// Admin: Test tracking number search
router.get("/orders/test-search", async (req, res) => {
  try {
    const { trackingNumber } = req.query;
    console.log('Testing tracking number search:', trackingNumber);
    
    const query = {};
    
    if (trackingNumber) {
      query.trackingNumber = { $regex: trackingNumber, $options: 'i' };
    }
    
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .limit(5);
    
    console.log('Found orders:', orders.length);
    console.log('Order tracking numbers:', orders.map(o => o.trackingNumber));
    
    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(order => ({
        _id: order._id,
        trackingNumber: order.trackingNumber,
        currentStatus: order.currentStatus,
        user: order.user,
      }))
    });
  } catch (error) {
    console.error('Test search error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Admin: Get tracking number suggestions
router.get("/orders/suggestions", verifyAdminToken, async (req, res) => {
  try {
    const { trackingNumber } = req.query;
    
    if (!trackingNumber || trackingNumber.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }
    
    const query = {
      trackingNumber: { $regex: trackingNumber, $options: 'i' }
    };
    
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .limit(10)
      .sort({ createdAt: -1 });
    
    const suggestions = orders.map(order => ({
      trackingNumber: order.trackingNumber,
      customerName: order.user?.name || 'Unknown',
      status: order.currentStatus,
      amount: order.totalAmount,
      createdAt: order.createdAt
    }));
    
    res.json({
      success: true,
      suggestions
    });
    
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggestions',
      error: error.message
    });
  }
});

// Admin: Enhanced search orders with advanced filters
router.get("/orders/search", verifyAdminToken, async (req, res) => {
  try {
    const { 
      trackingNumber, 
      status, 
      customerEmail, 
      dateFrom, 
      dateTo, 
      amountMin, 
      amountMax,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const query = {};
    
    // Tracking number filter
    if (trackingNumber) {
      query.trackingNumber = { $regex: trackingNumber, $options: 'i' };
    }
    
    // Status filter
    if (status) {
      query.currentStatus = status;
    }
    
    // Customer email filter
    if (customerEmail) {
      query['user.email'] = { $regex: customerEmail, $options: 'i' };
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    
    // Amount range filter
    if (amountMin || amountMax) {
      query.totalAmount = {};
      if (amountMin) {
        query.totalAmount.$gte = parseFloat(amountMin);
      }
      if (amountMax) {
        query.totalAmount.$lte = parseFloat(amountMax);
      }
    }
    
    // Build aggregation pipeline for complex queries
    let pipeline = [
      { $match: query }
    ];
    
    // Add lookup for user data if email filter is used
    if (customerEmail) {
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      });
      pipeline.push({
        $match: {
          'userData.email': { $regex: customerEmail, $options: 'i' }
        }
      });
    }
    
    // Add pagination
    pipeline.push(
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) }
    );
    
    // Add lookups for populated data
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productData'
        }
      },
      {
        $lookup: {
          from: 'groupbuys',
          localField: 'items.groupbuyId',
          foreignField: '_id',
          as: 'groupbuyData'
        }
      },
      {
        $lookup: {
          from: 'paymenthistories',
          localField: 'paymentHistoryId',
          foreignField: '_id',
          as: 'paymentHistory'
        }
      }
    );
    
    const orders = await Order.aggregate(pipeline);
    
    // Get total count for pagination
    const countPipeline = [{ $match: query }];
    if (customerEmail) {
      countPipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $match: {
            'userData.email': { $regex: customerEmail, $options: 'i' }
          }
        }
      );
    }
    countPipeline.push({ $count: 'total' });
    
    const countResult = await Order.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    // Format the response
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      trackingNumber: order.trackingNumber,
      currentStatus: order.currentStatus,
      totalAmount: order.totalAmount,
      walletUsed: order.walletUsed,
      paystackAmount: order.paystackAmount,
      allGroupsSecured: order.allGroupsSecured,
      priorityScore: order.priorityScore,
      fulfillmentChoice: order.fulfillmentChoice,
      estimatedFulfillmentTime: order.estimatedFulfillmentTime,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user[0] || null,
      items: order.items,
      progress: order.progress,
      paymentHistory: order.paymentHistory[0] || null,
    }));
    
    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching orders',
      error: error.message
    });
  }
});

// Admin: Export orders to CSV
router.get("/orders/export", verifyAdminToken, async (req, res) => {
  try {
    const { 
      trackingNumber, 
      status, 
      customerEmail, 
      dateFrom, 
      dateTo, 
      amountMin, 
      amountMax 
    } = req.query;
    
    const query = {};
    
    // Apply same filters as search
    if (trackingNumber) {
      query.trackingNumber = { $regex: trackingNumber, $options: 'i' };
    }
    if (status) {
      query.currentStatus = status;
    }
    if (customerEmail) {
      query['user.email'] = { $regex: customerEmail, $options: 'i' };
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }
    if (amountMin || amountMax) {
      query.totalAmount = {};
      if (amountMin) {
        query.totalAmount.$gte = parseFloat(amountMin);
      }
      if (amountMax) {
        query.totalAmount.$lte = parseFloat(amountMax);
      }
    }
    
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'title')
      .sort({ createdAt: -1 });
    
    // Generate CSV content
    const csvHeaders = [
      'Tracking Number',
      'Customer Name',
      'Customer Email',
      'Customer Phone',
      'Status',
      'Total Amount',
      'Wallet Used',
      'Paystack Amount',
      'Created Date',
      'Items Count',
      'Delivery Address'
    ];
    
    const csvRows = orders.map(order => [
      order.trackingNumber,
      order.user?.name || '',
      order.user?.email || '',
      order.user?.phone || '',
      order.currentStatus,
      order.totalAmount,
      order.walletUsed,
      order.paystackAmount,
      new Date(order.createdAt).toLocaleDateString(),
      order.items.length,
      `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}`
    ]);
    
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error exporting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting orders',
      error: error.message
    });
  }
});

// Admin: Get order by tracking number
router.get("/orders/tracking/:trackingNumber", verifyAdminToken, async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    const order = await Order.findOne({ trackingNumber })
      .populate('user', 'name email phone')
      .populate('items.product', 'title images price')
      .populate('items.groupbuyId', 'status unitsSold minimumViableUnits')
      .populate('paymentHistoryId', 'referenceId paystackReference status');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found with this tracking number'
      });
    }
    
    res.json({
      success: true,
      order: {
        _id: order._id,
        trackingNumber: order.trackingNumber,
        currentStatus: order.currentStatus,
        totalAmount: order.totalAmount,
        walletUsed: order.walletUsed,
        paystackAmount: order.paystackAmount,
        allGroupsSecured: order.allGroupsSecured,
        priorityScore: order.priorityScore,
        fulfillmentChoice: order.fulfillmentChoice,
        estimatedFulfillmentTime: order.estimatedFulfillmentTime,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        user: order.user,
        items: order.items,
        progress: order.progress,
        paymentHistory: order.paymentHistoryId,
      }
    });
    
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
});

// Admin: Get all orders with filters
router.get("/orders", verifyAdminToken, async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      allGroupsSecured,
      fulfillmentChoice
    } = req.query;
    
    const query = {};
    
    if (status) {
      query.currentStatus = status;
    }
    
    if (allGroupsSecured !== undefined) {
      query.allGroupsSecured = allGroupsSecured === 'true';
    }
    
    if (fulfillmentChoice) {
      query.fulfillmentChoice = fulfillmentChoice;
    }
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'title images price')
      .populate('items.groupbuyId', 'status unitsSold minimumViableUnits')
      .populate('paymentHistoryId', 'referenceId paystackReference status')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Order.countDocuments(query);
    
    res.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        trackingNumber: order.trackingNumber,
        currentStatus: order.currentStatus,
        totalAmount: order.totalAmount,
        walletUsed: order.walletUsed,
        paystackAmount: order.paystackAmount,
        allGroupsSecured: order.allGroupsSecured,
        priorityScore: order.priorityScore,
        fulfillmentChoice: order.fulfillmentChoice,
        estimatedFulfillmentTime: order.estimatedFulfillmentTime,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        user: order.user,
        items: order.items,
        progress: order.progress,
        paymentHistory: order.paymentHistoryId,
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

// Simple order status update endpoint (bypasses AdminJS)
router.patch("/orders/:orderId/status", verifyAdminToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { currentStatus, fulfillmentChoice, estimatedFulfillmentTime, message } = req.body;
    
    console.log('API: Updating order status:', orderId, 'to:', currentStatus);
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    const previousStatus = order.currentStatus;
    
    // Update the order
    if (currentStatus) order.currentStatus = currentStatus;
    if (fulfillmentChoice) order.fulfillmentChoice = fulfillmentChoice;
    if (estimatedFulfillmentTime) order.estimatedFulfillmentTime = new Date(estimatedFulfillmentTime);
    
    // Add progress entry if status changed
    if (currentStatus && currentStatus !== previousStatus) {
      order.progress.push({
        status: currentStatus,
        message: message || `Order status updated to ${currentStatus} by admin`,
        timestamp: new Date(),
      });
    }
    
    await order.save();
    
    console.log('API: Order status updated successfully:', orderId);
    
    res.json({
      success: true,
      message: `Order status updated to ${currentStatus}`,
      order: {
        _id: order._id,
        trackingNumber: order.trackingNumber,
        currentStatus: order.currentStatus,
        fulfillmentChoice: order.fulfillmentChoice,
        estimatedFulfillmentTime: order.estimatedFulfillmentTime,
        totalAmount: order.totalAmount,
        allGroupsSecured: order.allGroupsSecured,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }
    });
    
  } catch (error) {
    console.error('API: Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
});

// Admin: Get order statistics
router.get("/orders/stats", verifyAdminToken, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');
    
    res.json({
      success: true,
      stats: {
        byStatus: stats,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentOrders: recentOrders.map(order => ({
          _id: order._id,
          trackingNumber: order.trackingNumber,
          currentStatus: order.currentStatus,
          totalAmount: order.totalAmount,
          user: order.user,
          createdAt: order.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order statistics',
      error: error.message
    });
  }
});

// Enhanced image upload endpoint that saves to database
router.post("/upload-images", verifyAdminToken, upload.array("images", 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" })
    }

    const host = `${req.protocol}://${req.get("host")}`
    const uploadedImages = []

    // Save each uploaded image to database
    for (const file of req.files) {
      const imageUrl = `${host}/uploads/${file.filename}`

      const uploadedImage = await UploadedImage.create({
        filename: file.filename,
        originalName: file.originalname,
        url: imageUrl,
        size: file.size,
        mimetype: file.mimetype,
        uploadedBy: "admin",
        description: req.body.description || `Uploaded image: ${file.originalname}`,
        tags: req.body.tags ? req.body.tags.split(",").map((tag) => tag.trim()) : [],
      })

      uploadedImages.push(uploadedImage)
    }

    const imageUrls = uploadedImages.map((img) => img.url)

    res.json({
      success: true,
      message: "Images uploaded and saved to gallery",
      imageUrls,
      images: uploadedImages,
      count: req.files.length,
    })
  } catch (error) {
    console.error("Image upload error:", error)
    res.status(500).json({
      success: false,
      message: "Error uploading images",
      error: error.message,
    })
  }
})

// Get all uploaded images for selection
router.get("/uploaded-images", verifyAdminToken, async (req, res) => {
  try {
    const images = await UploadedImage.find({ isUsed: false })
      .sort({ createdAt: -1 })
      .limit(50)

    res.json({
      success: true,
      images: images.map((img) => ({
        _id: img._id,
        url: img.url,
        originalName: img.originalName,
        size: img.size,
        tags: img.tags,
        createdAt: img.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching uploaded images:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching images",
      error: error.message,
    })
  }
})

// Mark image as used
router.patch("/uploaded-images/:imageId/use", verifyAdminToken, async (req, res) => {
  try {
    const { imageId } = req.params
    const { productId } = req.body

    const image = await UploadedImage.findByIdAndUpdate(
      imageId,
      {
        isUsed: true,
        usedInProducts: productId ? [productId] : [],
      },
      { new: true }
    )

    if (!image) {
      return res.status(404).json({ message: "Image not found" })
    }

    res.json({
      success: true,
      message: "Image marked as used",
      image,
    })
  } catch (error) {
    console.error("Error marking image as used:", error)
    res.status(500).json({
      success: false,
      message: "Error updating image",
      error: error.message,
    })
  }
})

// Delete uploaded image
router.delete("/images/:id", verifyAdminToken, async (req, res) => {
  try {
    const image = await UploadedImage.findById(req.params.id)
    if (!image) {
      return res.status(404).json({ message: "Image not found" })
    }

    // Delete file from filesystem
    const fs = await import("fs")
    const path = await import("path")
    const filePath = path.join(process.cwd(), "uploads", image.filename)
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await UploadedImage.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: "Image deleted successfully",
    })
  } catch (error) {
    console.error("Delete image error:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting image",
      error: error.message,
    })
  }
})

// Process missing referral bonuses for all users
router.post("/process-missing-bonuses", verifyAdminToken, async (req, res) => {
  try {
    const { processReferralBonus, processAllMissingBonuses } = await import("../utils/referralBonusService.js");
    
    console.log("🔧 Admin requested system-wide missing bonus processing");
    
    const result = await processAllMissingBonuses();
    
    res.json({
      success: result.success,
      message: result.message,
      totalProcessed: result.totalProcessed,
      totalAmount: result.totalAmount
    });
  } catch (error) {
    console.error("Admin bonus processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing missing bonuses",
      error: error.message
    });
  }
});

// Process missing referral bonus for specific user
router.post("/process-user-bonus/:userId", verifyAdminToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { processReferralBonus } = await import("../utils/referralBonusService.js");
    
    console.log(`🔧 Admin requested bonus processing for user: ${userId}`);
    
    const result = await processReferralBonus(userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        bonusAmount: result.bonusAmount,
        newBalance: result.newBalance,
        totalReferrals: result.totalReferrals
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Admin user bonus processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing user bonus",
      error: error.message
    });
  }
});

// Admin: Cancel order with notification
router.post("/orders/:trackingNumber/cancel", verifyAdminToken, async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { reason } = req.body;
    const adminName = req.user?.name || req.user?.email || "Admin";

    const order = await Order.findOne({ trackingNumber })
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.currentStatus === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    const previousStatus = order.currentStatus;
    order.currentStatus = "cancelled";
    order.progress.push({
      status: "cancelled",
      message: `Order cancelled by admin: ${reason}`,
      timestamp: new Date(),
    });

    await order.save();

    // Send notification to customer
    await notificationService.notifyAdminOrderCancellation(
      order.user._id,
      {
        orderId: order._id,
        trackingNumber: order.trackingNumber,
      },
      reason,
      adminName
    );

    logger.info(`📦 Admin ${adminName} cancelled order ${trackingNumber}: ${reason}`);

    res.json({
      success: true,
      message: "Order cancelled successfully",
      trackingNumber: order.trackingNumber,
      previousStatus,
      customerNotified: true,
    });
  } catch (error) {
    logger.error("Admin order cancellation error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: error.message
    });
  }
});

// Admin: Process refund with notification
router.post("/orders/:trackingNumber/refund", verifyAdminToken, async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { amount, reason } = req.body;
    const adminName = req.user?.name || req.user?.email || "Admin";

    const order = await Order.findOne({ trackingNumber })
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid refund amount" });
    }

    // Process refund logic here (update wallet, etc.)
    // This is a placeholder - implement actual refund logic
    const Wallet = (await import("../models/Wallet.js")).default;
    const userWallet = await Wallet.findOne({ user: order.user._id });
    
    if (userWallet) {
      userWallet.balance += amount;
      await userWallet.save();
    }

    // Send notification to customer
    await notificationService.notifyAdminRefundProcessed(
      order.user._id,
      amount,
      reason,
      order._id,
      adminName
    );

    logger.info(`💰 Admin ${adminName} processed refund for order ${trackingNumber}: ₦${amount} - ${reason}`);

    res.json({
      success: true,
      message: "Refund processed successfully",
      trackingNumber: order.trackingNumber,
      refundAmount: amount,
      reason,
      customerNotified: true,
    });
  } catch (error) {
    logger.error("Admin refund processing error:", error);
    res.status(500).json({
      success: false,
      message: "Error processing refund",
      error: error.message
    });
  }
});

// Admin: Schedule delivery with notification
router.post("/orders/:trackingNumber/schedule-delivery", verifyAdminToken, async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { deliveryInfo, scheduledDate } = req.body;
    const adminName = req.user?.name || req.user?.email || "Admin";

    const order = await Order.findOne({ trackingNumber })
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order with delivery information
    order.deliveryScheduled = true;
    order.deliveryScheduledDate = scheduledDate;
    order.progress.push({
      status: "delivery_scheduled",
      message: `Delivery scheduled: ${deliveryInfo}`,
      timestamp: new Date(),
    });

    await order.save();

    // Send notification to customer
    await notificationService.notifyAdminDeliveryScheduled(
      order.user._id,
      {
        orderId: order._id,
        trackingNumber: order.trackingNumber,
      },
      deliveryInfo,
      adminName
    );

    logger.info(`🚚 Admin ${adminName} scheduled delivery for order ${trackingNumber}: ${deliveryInfo}`);

    res.json({
      success: true,
      message: "Delivery scheduled successfully",
      trackingNumber: order.trackingNumber,
      deliveryInfo,
      scheduledDate,
      customerNotified: true,
    });
  } catch (error) {
    logger.error("Admin delivery scheduling error:", error);
    res.status(500).json({
      success: false,
      message: "Error scheduling delivery",
      error: error.message
    });
  }
});

// Admin: Mark order ready for pickup with notification
router.post("/orders/:trackingNumber/ready-pickup", verifyAdminToken, async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { pickupLocation } = req.body;
    const adminName = req.user?.name || req.user?.email || "Admin";

    const order = await Order.findOne({ trackingNumber })
      .populate("user", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Update order status
    order.currentStatus = "ready_for_pickup";
    order.progress.push({
      status: "ready_for_pickup",
      message: `Order ready for pickup at ${pickupLocation}`,
      timestamp: new Date(),
    });

    await order.save();

    // Send notification to customer
    await notificationService.notifyAdminPickupReady(
      order.user._id,
      {
        orderId: order._id,
        trackingNumber: order.trackingNumber,
      },
      pickupLocation,
      adminName
    );

    logger.info(`📦 Admin ${adminName} marked order ${trackingNumber} ready for pickup at ${pickupLocation}`);

    res.json({
      success: true,
      message: "Order marked ready for pickup",
      trackingNumber: order.trackingNumber,
      pickupLocation,
      customerNotified: true,
    });
  } catch (error) {
    logger.error("Admin pickup ready error:", error);
    res.status(500).json({
      success: false,
      message: "Error marking order ready for pickup",
      error: error.message
    });
  }
});

export default router
