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
          // ✅ FIXED: Proper array field configuration
          images: {
            isArray: true,
            isVisible: { 
              list: false, 
              edit: true, 
              show: true, 
              filter: false,
              new: true
            },
            description: '🖼️ Add image URLs. Use /admin-upload.html to upload images and get URLs.'
          },
          variants: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: true, edit: true, show: true, filter: false, new: true },
            description: '🏷️ Add product variants as JSON (e.g., [{"name":"Size","options":["Small","Large"],"price":0}])'
          },
          lowStockThreshold: {
            type: 'number',
            isVisible: { list: true, edit: true, show: true, filter: true, new: true },
          },
          shareLink: {
            isVisible: {
              list: false,
              edit: false,
              show: true,
              filter: false,
              new: false,
            },
            components: {
              show: ShareLinkComponent,
            },
          },
        },
        actions: {
          new: { isAccessible: true },
          edit: { isAccessible: true },
        },
      },
    },
    {
      resource: UploadedImage,
      options: {
        properties: {
          url: {
            isVisible: { list: true, show: true, edit: false, filter: false, new: false },
          },
          originalName: {
            isVisible: { list: true, show: true, edit: false, filter: true, new: false },
          },
          size: {
            isVisible: { list: true, show: true, edit: false, filter: false, new: false },
            type: 'number',
          },
          isUsed: {
            isVisible: { list: true, show: true, edit: true, filter: true, new: false },
          },
          usedInProducts: {
            reference: 'Product',
            isVisible: { list: false, show: true, edit: false, filter: false, new: false },
          },
          tags: {
            isArray: true,
            isVisible: { list: true, show: true, edit: true, filter: true, new: false },
          },
          description: {
            isVisible: { list: false, show: true, edit: true, filter: false, new: false },
          },
        },
        actions: {
          new: { isAccessible: false },
          edit: { 
            isAccessible: true,
            properties: ['tags', 'description', 'isUsed']
          },
          delete: { isAccessible: true },
        },
        listProperties: ['originalName', 'size', 'isUsed', 'tags', 'createdAt'],
        showProperties: ['url', 'originalName', 'size', 'mimetype', 'isUsed', 'usedInProducts', 'tags', 'description', 'createdAt'],
      },
    },
    {
      resource: PaymentHistory,
      options: {
        properties: {
          userId: {
            reference: 'User',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          orderId: {
            reference: 'Order',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          referenceId: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          paystackReference: {
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
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          groupBuysCreated: {
            reference: 'GroupBuy',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
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
        properties: {
          trackingNumber: {
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          paymentHistoryId: {
            reference: 'PaymentHistory',
            isVisible: { list: false, filter: true, show: true, edit: false },
          },
          user: {
            reference: 'User',
            isVisible: { list: true, filter: true, show: true, edit: false },
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
            ],
            isEditable: true,
          },
          totalAmount: {
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
          priorityScore: {
            type: 'number',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          allGroupsSecured: {
            type: 'boolean',
            isVisible: { list: true, filter: true, show: true, edit: false },
          },
          fulfillmentChoice: {
            availableValues: [
              { value: 'pickup', label: 'Pickup' },
              { value: 'delivery', label: 'Delivery' },
            ],
            isVisible: { list: true, filter: true, show: true, edit: true },
          },
          items: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          deliveryAddress: {
            type: 'mixed',
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
          progress: {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: false },
          },
        },
        actions: {
          new: { isAccessible: false },
          edit: { 
            isAccessible: true,
            properties: ['currentStatus', 'fulfillmentChoice']
          },
          delete: { isAccessible: false },
        },
        listProperties: ['trackingNumber', 'user', 'currentStatus', 'totalAmount', 'priorityScore', 'allGroupsSecured', 'createdAt'],
        showProperties: ['trackingNumber', 'paymentHistoryId', 'user', 'currentStatus', 'totalAmount', 'walletUsed', 'paystackAmount', 'priorityScore', 'allGroupsSecured', 'fulfillmentChoice', 'items', 'deliveryAddress', 'progress', 'createdAt', 'updatedAt'],
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
              { value: 'manual_review', label: 'Manual Review' },
              { value: 'failed', label: 'Failed' },
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
          new: { isAccessible: true },
          edit: { isAccessible: true },
          delete: { isAccessible: true },
        },
        listProperties: ['productId', 'unitsSold', 'minimumViableUnits', 'status', 'expiresAt', 'createdAt'],
        showProperties: ['productId', 'participants', 'unitsSold', 'minimumViableUnits', 'status', 'expiresAt', 'paymentHistories', 'adminNotes', 'finalizedAt', 'createdAt', 'updatedAt'],
      },
    },
    {
      resource: Transaction,
    },
    {
      resource: Category,
    },
  ],
  branding: {
    companyName: 'Grup Admin',
    logo: false,
    softwareBrothers: false,
  },
  dashboard: {
    handler: async () => {
      const totalUsers = await User.countDocuments()
      const activeGroupBuys = await GroupBuy.countDocuments({ status: 'active' })
      const totalSales = await Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ])
      const topProduct = await Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalBought: { $sum: '$items.quantity' } } },
        { $sort: { totalBought: -1 } },
        { $limit: 1 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        { $project: { name: '$product.title' } },
      ])

      const totalImages = await UploadedImage.countDocuments()
      const unusedImages = await UploadedImage.countDocuments({ isUsed: false })
      const totalPayments = await PaymentHistory.countDocuments()
      const successfulPayments = await PaymentHistory.countDocuments({ status: 'paid' })
      const totalOrders = await Order.countDocuments()
      const pendingOrders = await Order.countDocuments({ 
        currentStatus: { $in: ['groups_forming', 'all_secured', 'processing'] }
      })

      return {
        totalUsers,
        activeGroupBuys,
        totalSales: totalSales[0]?.total || 0,
        topProduct: topProduct[0]?.name || 'No orders yet',
        totalImages,
        unusedImages,
        totalPayments,
        successfulPayments,
        totalOrders,
        pendingOrders,
      }
    },
  },
})

const ADMIN = {
  email: 'adiazi@grup.com',
  password: '12345678',
}

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate: async (email, password) => {
    if (email === ADMIN.email && password === ADMIN.password) {
      return ADMIN
    }
    return null
  },
  cookieName: 'adminjs',
  cookiePassword: 'supersecret-cookie-password',
})

export { adminJs, adminRouter }
