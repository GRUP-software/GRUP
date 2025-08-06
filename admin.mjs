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
      resource: Order,
      options: {
        properties: {
          currentStatus: {
            availableValues: [
              { value: 'pending', label: 'Pending' },
              { value: 'groups_forming', label: 'Groups Forming' },
              { value: 'all_secured', label: 'All Secured' },
              { value: 'processing', label: 'Processing' },
              { value: 'packaged', label: 'Packaged' },
              { value: 'dispatched', label: 'Dispatched' },
              { value: 'out_for_delivery', label: 'Out for Delivery' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
            isEditable: true,
          },
          paymentStatus: {
            availableValues: [
              { value: 'pending', label: 'Pending' },
              { value: 'pending_verification', label: 'Pending Verification' },
              { value: 'paid', label: 'Paid' },
              { value: 'failed', label: 'Failed' },
            ],
            isEditable: true,
          },
        },
      },
    },
    {
      resource: GroupBuy,
      options: {
        properties: {
          status: {
            availableValues: [
              { value: 'forming', label: 'Forming' },
              { value: 'secured', label: 'Secured' },
              { value: 'dispatched', label: 'Dispatched' },
              { value: 'expired', label: 'Expired' },
            ],
            isEditable: true,
          },
        },
        actions: {
          new: { isAccessible: true },
          delete: { isAccessible: true },
        },
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
      const activeGroupBuys = await GroupBuy.countDocuments({ status: 'forming' })
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

      return {
        totalUsers,
        activeGroupBuys,
        totalSales: totalSales[0]?.total || 0,
        topProduct: topProduct[0]?.name || 'No orders yet',
        totalImages,
        unusedImages,
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
