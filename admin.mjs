// admin.mjs
import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import * as AdminJSMongoose from '@adminjs/mongoose'
import { ComponentLoader } from 'adminjs'
import path from 'path'
import { fileURLToPath } from 'url'

// Fix __dirname in ES module context
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load models
import User from './models/User.js'
import Product from './models/Product.js'
import Order from './models/order.js'
import Wallet from './models/Wallet.js'
import Transaction from './models/Transaction.js'
import GroupBuy from './models/GroupBuy.js'
import Category from './models/categoryModel.js'
import UploadedImage from './models/uploadedImage.js'
import PaymentHistory from './models/PaymentHistory.js'

// Register Mongoose adapter
AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
})

// Set up component loader - ONLY load components that exist
const componentLoader = new ComponentLoader()

// Only add ShareLinkComponent if it exists
const ShareLinkComponent = componentLoader.add(
  'ShareLinkComponent',
  path.join(__dirname, 'components', 'ShareLinkComponent.jsx')
)

// We'll add it back as a simple text field for now
let SellingUnitsManagerComponent = null



// AdminJS config
const adminJs = new AdminJS({
  rootPath: '/admin',
  componentLoader,
  resources: [
    {
      resource: User,
      options: {
        properties: {
          password: { isVisible: false },
          wallet: {
            reference: 'Wallet',
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          referredBy: {
            reference: 'User',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          referralCode: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
        },
        actions: {
          edit: { isAccessible: true },
          new: { isAccessible: false },
        },
      },
    },
    {
      resource: Wallet,
      options: {
        properties: {
          balance: { isVisible: true },
          user: {
            reference: 'User',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
        },
        actions: {
          edit: { isAccessible: true },
        },
      },
    },
    {
      resource: Product,
      options: {
        properties: {
          unitTag: {
            availableValues: [
              { value: 'Litres', label: 'Litres' },
              { value: 'Paint', label: 'Paint' },
              { value: 'Bags', label: 'Bags' },
              { value: 'Kg', label: 'Kilograms' },
              { value: 'Bottles', label: 'Bottles' },
              { value: 'Piece', label: 'Piece' },
            ],
            isRequired: true,
          },
          // Price range fields
          minPrice: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          maxPrice: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          basePrice: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          price: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          // Selling units configuration
          sellingUnits: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: true },
          },
          // Group buy settings
          groupBuyEnabled: {
            type: 'boolean',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          minimumViableUnits: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          groupBuyDuration: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          // Stock management
          stock: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          lowStockThreshold: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          // Images
          images: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: true },
          },
          // SEO and metadata
          slug: {
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          metaTitle: {
            isVisible: { list: false, filter: false, show: true, edit: true },
          },
          metaDescription: {
            type: 'textarea',
            isVisible: { list: false, filter: false, show: true, edit: true },
          },
          // Status and visibility
          isActive: {
            type: 'boolean',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          isFeatured: {
            type: 'boolean',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          // Category
          category: {
            reference: 'Category',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
        },
        actions: {
          edit: { isAccessible: true },
          new: { isAccessible: true },
        },
      },
    },
    {
      resource: PaymentHistory,
      options: {
        properties: {
          referenceId: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          paystackReference: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          userId: {
            reference: 'User',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          orderId: {
            reference: 'Order',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          amount: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          walletUsed: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          paystackAmount: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          status: {
            availableValues: [
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'failed', label: 'Failed' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          cartItems: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          metadata: {
            type: 'mixed',
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
        },
        actions: {
          new: { isAccessible: false },
          edit: { 
            isAccessible: true,
            properties: ['status']
          },
          delete: { isAccessible: false },
        },
        listProperties: ['referenceId', 'userId', 'amount', 'status', 'createdAt'],
        showProperties: ['referenceId', 'paystackReference', 'userId', 'orderId', 'amount', 'walletUsed', 'paystackAmount', 'status', 'cartItems', 'groupBuysCreated', 'metadata', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: Order,
      options: {
        navigation: {
          name: 'Orders',
          icon: 'Package',
        },
        listProperties: ['trackingNumber', 'user', 'currentStatus', 'totalAmount', 'priorityScore', 'allGroupsSecured', 'createdAt'],
        showProperties: ['trackingNumber', 'paymentHistoryId', 'user', 'currentStatus', 'totalAmount', 'walletUsed', 'paystackAmount', 'priorityScore', 'allGroupsSecured', 'fulfillmentChoice', 'estimatedFulfillmentTime', 'items', 'deliveryAddress', 'progress', 'createdAt', 'updatedAt'],
        filterProperties: ['trackingNumber'],
        sort: {
          sortBy: 'createdAt',
          direction: 'desc',
        },
        properties: {
          _id: {
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          trackingNumber: {
            isVisible: { list: true, filter: true, show: true, edit: false },
            isFilterable: true,
            isSearchable: true,
            filter: {
              type: 'string',
              component: 'TextFilter',
            },
          },
          paymentHistoryId: {
            reference: 'PaymentHistory',
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          user: {
            reference: 'User',
            isVisible: { list: true, filter: false, show: true, edit: false },
          },
          currentStatus: {
            availableValues: [
              { value: 'groups_forming', label: 'Groups Forming' },
              { value: 'all_secured', label: 'All Secured' },
              { value: 'processing', label: 'Processing' },
              { value: 'packaged', label: 'Packaged' },
              { value: 'awaiting_fulfillment_choice', label: 'Awaiting Fulfillment Choice' },
              { value: 'ready_for_pickup', label: 'Ready for Pickup' },
              { value: 'out_for_delivery', label: 'Out for Delivery' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'picked_up', label: 'Picked Up' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'groups_under_review', label: 'Groups Under Review' },
            ],
            isEditable: true,
            isRequired: true,
            isVisible: { list: true, filter: false, show: true, edit: true },
          },
          totalAmount: {
            type: 'number',
            isVisible: { list: true, filter: false, show: true, edit: false },
            isRequired: true,
          },
          walletUsed: {
            type: 'number',
            isVisible: { list: true, filter: false, show: true, edit: false },
            isRequired: true,
          },
          paystackAmount: {
            type: 'number',
            isVisible: { list: true, filter: false, show: true, edit: false },
            isRequired: true,
          },
          priorityScore: {
            type: 'number',
            isVisible: { list: true, filter: false, show: true, edit: false },
            isRequired: true,
          },
          allGroupsSecured: {
            type: 'boolean',
            isVisible: { list: true, filter: false, show: true, edit: false },
            isRequired: true,
          },
          fulfillmentChoice: {
            availableValues: [
              { value: 'pickup', label: 'Pickup' },
              { value: 'delivery', label: 'Delivery' },
            ],
            isVisible: { list: true, filter: false, show: true, edit: true },
            isRequired: true,
          },
          items: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
            isRequired: true,
          },
          deliveryAddress: {
            type: 'mixed',
            isVisible: { list: false, filter: false, show: true, edit: false },
            isRequired: true,
          },
          progress: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
            isRequired: true,
          },
          estimatedFulfillmentTime: {
            type: 'datetime',
            isVisible: { list: true, filter: false, show: true, edit: true },
          },
          createdAt: {
            type: 'datetime',
            isVisible: { list: true, filter: false, show: true, edit: false },
          },
          updatedAt: {
            type: 'datetime',
            isVisible: { list: true, filter: false, show: true, edit: false },
          },
        },
                actions: {
          new: { isAccessible: false },
          list: {
            before: async (request, context) => {
              console.log('AdminJS List Request:', {
                query: request.query,
                filters: request.query?.filters,
                trackingNumber: request.query?.filters?.trackingNumber
              });
              
              // Handle tracking number filter manually
              if (request.query?.filters?.trackingNumber) {
                const trackingNumber = request.query.filters.trackingNumber;
                console.log('🔍 Filtering by tracking number:', trackingNumber);
                
                // Import Order model
                const Order = (await import('./models/order.js')).default;
                
                // Find orders with matching tracking number
                const filteredOrders = await Order.find({
                  trackingNumber: { $regex: trackingNumber, $options: 'i' }
                }).populate('user', 'name email');
                
                console.log(`✅ Found ${filteredOrders.length} orders matching "${trackingNumber}"`);
                
                // Update the request to use our filtered results
                request.query.filters = { ...request.query.filters };
                delete request.query.filters.trackingNumber; // Remove the filter so AdminJS doesn't apply it again
                
                // Store our filtered results for the after hook
                request.customFilteredOrders = filteredOrders;
              }
              
              return request;
            },
            after: async (response, request, context) => {
              console.log('AdminJS List Response - Records count:', response.records?.length || 0);
              
              // If we have custom filtered results, replace the response
              if (request.customFilteredOrders) {
                console.log('🔄 Replacing AdminJS results with custom filtered results');
                
                // Convert our filtered orders to AdminJS record format
                const customRecords = request.customFilteredOrders.map(order => ({
                  id: order._id.toString(),
                  title: order.trackingNumber,
                  params: {
                    trackingNumber: order.trackingNumber,
                    user: order.user?.name || 'Unknown',
                    currentStatus: order.currentStatus,
                    totalAmount: order.totalAmount,
                    priorityScore: order.priorityScore,
                    allGroupsSecured: order.allGroupsSecured,
                    createdAt: order.createdAt
                  }
                }));
                
                response.records = customRecords;
                response.meta.total = customRecords.length;
                response.meta.perPage = customRecords.length;
                
                console.log(`✅ Custom filter applied: ${customRecords.length} records returned`);
              }
              
              if (response.records && response.records.length > 0) {
                console.log('Sample record:', {
                  id: response.records[0].id,
                  trackingNumber: response.records[0].params?.trackingNumber,
                  currentStatus: response.records[0].params?.currentStatus,
                  user: response.records[0].params?.user
                });
              }
              
              return response;
            },
          },
          edit: { 
            isAccessible: true,
            before: async (request, context) => {
              try {
                const { recordId } = request.params;
                const Order = (await import('./models/order.js')).default;
                const order = await Order.findById(recordId);
                
                if (!order) {
                  throw new Error('Order not found');
                }
                
                // Ensure all required fields exist to prevent toJSON errors
                const safeOrder = {
                  _id: order._id,
                  trackingNumber: order.trackingNumber || '',
                  currentStatus: order.currentStatus || 'groups_forming',
                  totalAmount: order.totalAmount || 0,
                  walletUsed: order.walletUsed || 0,
                  paystackAmount: order.paystackAmount || 0,
                  priorityScore: order.priorityScore || 0,
                  allGroupsSecured: order.allGroupsSecured || false,
                  fulfillmentChoice: order.fulfillmentChoice || 'pickup',
                  estimatedFulfillmentTime: order.estimatedFulfillmentTime || new Date(),
                  user: order.user || null,
                  paymentHistoryId: order.paymentHistoryId || null,
                  items: order.items || [],
                  deliveryAddress: order.deliveryAddress || {},
                  progress: order.progress || [],
                  createdAt: order.createdAt || new Date(),
                  updatedAt: order.updatedAt || new Date(),
                };
                
                // Update the request with safe data
                request.payload = { ...request.payload, ...safeOrder };
                
                return request;
              } catch (error) {
                console.error('Error in edit before hook:', error);
                throw error;
              }
            },
            after: async (response, request, context) => {
              try {
                const { recordId } = request.params;
                const { currentStatus, fulfillmentChoice, estimatedFulfillmentTime } = request.payload;
                
                if (currentStatus || fulfillmentChoice || estimatedFulfillmentTime) {
                  const Order = (await import('./models/order.js')).default;
                  const order = await Order.findById(recordId);
                  
                  if (order) {
                    const previousStatus = order.currentStatus;
                    
                    if (currentStatus) order.currentStatus = currentStatus;
                    if (fulfillmentChoice) order.fulfillmentChoice = fulfillmentChoice;
                    if (estimatedFulfillmentTime) order.estimatedFulfillmentTime = new Date(estimatedFulfillmentTime);
                    
                    // Add progress entry if status changed
                    if (currentStatus && currentStatus !== previousStatus) {
                      order.progress.push({
                        status: currentStatus,
                        message: `Order status updated to ${currentStatus} by admin`,
                        timestamp: new Date(),
                      });
                    }
                    
                    await order.save();
                    console.log('Order updated successfully:', recordId);
                  }
                }
                
                return response;
              } catch (error) {
                console.error('Error in edit after hook:', error);
                return response;
              }
            }
          },
          delete: { isAccessible: false },
          
        },
      },
    },
    {
      resource: GroupBuy,
      options: {
        properties: {
          productId: {
            reference: 'Product',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          participants: {
            reference: 'User',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          unitsSold: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          minimumViableUnits: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          status: {
            availableValues: [
              { value: 'active', label: 'Active' },
              { value: 'successful', label: 'Successful' },
              { value: 'secured', label: 'Secured' },
              { value: 'processing', label: 'Processing' },
              { value: 'packaging', label: 'Packaging' },
              { value: 'ready_for_pickup', label: 'Ready for Pickup' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'manual_review', label: 'Manual Review' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ],
            isEditable: true,
          },
          expiresAt: {
            type: 'datetime',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          paymentHistories: {
            reference: 'PaymentHistory',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          adminNotes: {
            type: 'textarea',
            isVisible: { list: false, filter: false, show: true, edit: true },
          },
          finalizedAt: {
            type: 'datetime',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
        },
        actions: {
          edit: { isAccessible: true },
          new: { isAccessible: false },
        },
      },
    },
    {
      resource: Transaction,
      options: {
        properties: {
          user: {
            reference: 'User',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          type: {
            availableValues: [
              { value: 'credit', label: 'Credit' },
              { value: 'debit', label: 'Debit' },
            ],
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          amount: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          description: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          reference: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
        },
        actions: {
          edit: { isAccessible: false },
          new: { isAccessible: false },
        },
      },
    },
    {
      resource: Category,
      options: {
        properties: {
          name: {
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          description: {
            type: 'textarea',
            isVisible: { list: false, filter: false, show: true, edit: true },
          },
          slug: {
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          isActive: {
            type: 'boolean',
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
        },
        actions: {
          edit: { isAccessible: true },
          new: { isAccessible: true },
        },
      },
    },
    {
      resource: UploadedImage,
      options: {
        properties: {
          url: {
            isVisible: { list: true, filter: false, show: true, edit: false },
          },
          publicId: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          uploadedBy: {
            reference: 'User',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          uploadedAt: {
            type: 'datetime',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
        },
        actions: {
          edit: { isAccessible: false },
          new: { isAccessible: false },
        },
      },
    },
  ],
  branding: {
    companyName: 'Grup Admin',
    logo: false,
    softwareBrothers: false,
  },
})

// Build and use a router which will handle all AdminJS routes
const router = AdminJSExpress.buildAuthenticatedRouter(
  adminJs,
  {
    authenticate: async (email, password) => {
      // Admin authentication with updated credentials
      if (email === 'adiazi@grup.com' && password === '12345678') {
        return { email: 'adiazi@grup.com', role: 'admin' }
      }
      return null
    },
    cookieName: 'adminjs',
    cookiePassword: 'somepassword',
  },
  null,
  {
    resave: false,
    saveUninitialized: false,
  }
)

export { adminJs, router }
