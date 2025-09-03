// admin.mjs
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import { ComponentLoader } from 'adminjs';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';

// Fix __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load models
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/order.js';
import Wallet from './models/Wallet.js';
import Transaction from './models/Transaction.js';
import GroupBuy from './models/GroupBuy.js';
import Category from './models/categoryModel.js';
import UploadedImage from './models/uploadedImage.js';
import PaymentHistory from './models/PaymentHistory.js';

// Register Mongoose adapter
AdminJS.registerAdapter({
    Resource: AdminJSMongoose.Resource,
    Database: AdminJSMongoose.Database,
});

// Set up component loader - ONLY load components that exist
const componentLoader = new ComponentLoader();

// Only add ShareLinkComponent if it exists
const ShareLinkComponent = componentLoader.add(
    'ShareLinkComponent',
    path.join(__dirname, 'components', 'ShareLinkComponent.jsx')
);

// We'll add it back as a simple text field for now
let SellingUnitsManagerComponent = null;

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
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    referredBy: {
                        reference: 'User',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    referralCode: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                },
                actions: {
                    edit: { isAccessible: true },
                    new: { isAccessible: false },
                },
                perPage: 200,
            },
        },
        {
            resource: Wallet,
            options: {
                properties: {
                    balance: { isVisible: true },
                    user: {
                        reference: 'User',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                },
                actions: {
                    edit: { isAccessible: true },
                },
                perPage: 200,
            },
        },
        {
            resource: Product,
            options: {
                properties: {
                    title: {
                        type: 'string',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                        isRequired: true,
                    },
                    description: {
                        type: 'textarea',
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: true,
                        },
                    },
                    price: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                        isRequired: true,
                    },
                    image: {
                        type: 'string',
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: true,
                        },
                    },
                    category: {
                        type: 'string',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    stock: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    groupEligible: {
                        type: 'boolean',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    isActive: {
                        type: 'boolean',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                },
                actions: {
                    edit: { isAccessible: true },
                    new: { isAccessible: true },
                },
                perPage: 200,
            },
        },
        {
            resource: PaymentHistory,
            options: {
                properties: {
                    referenceId: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    flutterwaveReference: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    userId: {
                        reference: 'User',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    orderId: {
                        reference: 'Order',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    amount: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    walletUsed: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    flutterwaveAmount: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    status: {
                        availableValues: [
                            { value: 'pending', label: 'Pending' },
                            { value: 'paid', label: 'Paid' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ],
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    cartItems: {
                        type: 'mixed',
                        isArray: true,
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    metadata: {
                        type: 'mixed',
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                },
                actions: {
                    new: { isAccessible: false },
                    edit: {
                        isAccessible: true,
                        properties: ['status'],
                    },
                    delete: { isAccessible: false },
                },
                listProperties: [
                    'referenceId',
                    'userId',
                    'amount',
                    'status',
                    'createdAt',
                ],
                showProperties: [
                    'referenceId',
                    'flutterwaveReference',
                    'userId',
                    'orderId',
                    'amount',
                    'walletUsed',
                    'flutterwaveAmount',
                    'status',
                    'cartItems',
                    'groupBuysCreated',
                    'metadata',
                    'createdAt',
                    'updatedAt',
                ],
                perPage: 200,
            },
        },
        {
            resource: Order,
            options: {
                navigation: {
                    name: 'Orders',
                    icon: 'Package',
                },
                listProperties: [
                    'trackingNumber',
                    'user',
                    'currentStatus',
                    'totalAmount',
                    'fulfillmentChoice',
                    'createdAt',
                ],
                showProperties: [
                    'trackingNumber',
                    'user',
                    'currentStatus',
                    'totalAmount',
                    'fulfillmentChoice',
                    'estimatedFulfillmentTime',
                    'createdAt',
                ],
                filterProperties: ['trackingNumber'],
                perPage: 200,
                sort: {
                    sortBy: 'createdAt',
                    direction: 'desc',
                },
                properties: {
                    trackingNumber: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    user: {
                        reference: 'User',
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    currentStatus: {
                        availableValues: [
                            {
                                value: 'groups_forming',
                                label: 'Groups Forming',
                            },
                            { value: 'all_secured', label: 'All Secured' },
                            { value: 'processing', label: 'Processing' },
                            { value: 'packaged', label: 'Packaged' },
                            {
                                value: 'awaiting_fulfillment_choice',
                                label: 'Awaiting Fulfillment Choice',
                            },
                            {
                                value: 'ready_for_pickup',
                                label: 'Ready for Pickup',
                            },
                            {
                                value: 'out_for_delivery',
                                label: 'Out for Delivery',
                            },
                            { value: 'delivered', label: 'Delivered' },
                            { value: 'picked_up', label: 'Picked Up' },
                            { value: 'cancelled', label: 'Cancelled' },
                            {
                                value: 'groups_under_review',
                                label: 'Groups Under Review',
                            },
                        ],
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: true,
                        },
                    },
                    totalAmount: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    fulfillmentChoice: {
                        availableValues: [
                            { value: 'pickup', label: 'Pickup' },
                            { value: 'delivery', label: 'Delivery' },
                        ],
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: true,
                        },
                    },
                    estimatedFulfillmentTime: {
                        type: 'datetime',
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: true,
                        },
                    },
                    createdAt: {
                        type: 'datetime',
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                },
                actions: {
                    new: { isAccessible: false },
                    edit: {
                        isAccessible: true,
                        before: async (request, context) => {
                            try {
                                const { recordId } = request.params;
                                const Order = (
                                    await import('./models/order.js')
                                ).default;
                                const order = await Order.findById(recordId);

                                if (!order) {
                                    throw new Error('Order not found');
                                }

                                return request;
                            } catch (error) {
                                console.error(
                                    'Error in edit before hook:',
                                    error
                                );
                                throw error;
                            }
                        },
                        after: async (response, request, context) => {
                            try {
                                const { recordId } = request.params;
                                const {
                                    currentStatus,
                                    fulfillmentChoice,
                                    estimatedFulfillmentTime,
                                } = request.payload;

                                if (
                                    currentStatus ||
                                    fulfillmentChoice ||
                                    estimatedFulfillmentTime
                                ) {
                                    const Order = (
                                        await import('./models/order.js')
                                    ).default;
                                    const order =
                                        await Order.findById(recordId);

                                    if (order) {
                                        const previousStatus =
                                            order.currentStatus;

                                        if (currentStatus)
                                            order.currentStatus = currentStatus;
                                        if (fulfillmentChoice)
                                            order.fulfillmentChoice =
                                                fulfillmentChoice;
                                        if (estimatedFulfillmentTime)
                                            order.estimatedFulfillmentTime =
                                                new Date(
                                                    estimatedFulfillmentTime
                                                );

                                        // Add progress entry if status changed
                                        if (
                                            currentStatus &&
                                            currentStatus !== previousStatus
                                        ) {
                                            order.progress.push({
                                                status: currentStatus,
                                                message: `Order status updated to ${currentStatus} by admin`,
                                                timestamp: new Date(),
                                            });
                                        }

                                        await order.save();
                                        console.log(
                                            'Order updated successfully:',
                                            recordId
                                        );
                                    }
                                }

                                return response;
                            } catch (error) {
                                console.error(
                                    'Error in edit after hook:',
                                    error
                                );
                                return response;
                            }
                        },
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
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    participants: {
                        reference: 'User',
                        isArray: true,
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    unitsSold: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    minimumViableUnits: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    status: {
                        availableValues: [
                            { value: 'active', label: 'Active' },
                            { value: 'successful', label: 'Successful' },
                            { value: 'secured', label: 'Secured' },
                            { value: 'processing', label: 'Processing' },
                            { value: 'packaging', label: 'Packaging' },
                            {
                                value: 'ready_for_pickup',
                                label: 'Ready for Pickup',
                            },
                            { value: 'delivered', label: 'Delivered' },
                            { value: 'manual_review', label: 'Manual Review' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'refunded', label: 'Refunded' },
                        ],
                        isEditable: true,
                    },
                    expiresAt: {
                        type: 'datetime',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    paymentHistories: {
                        reference: 'PaymentHistory',
                        isArray: true,
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    adminNotes: {
                        type: 'textarea',
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: true,
                        },
                    },
                    finalizedAt: {
                        type: 'datetime',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                },
                actions: {
                    edit: { isAccessible: true },
                    new: { isAccessible: false },
                },
                perPage: 200,
            },
        },
        {
            resource: Transaction,
            options: {
                properties: {
                    user: {
                        reference: 'User',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    type: {
                        availableValues: [
                            { value: 'credit', label: 'Credit' },
                            { value: 'debit', label: 'Debit' },
                        ],
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    amount: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    description: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    reference: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                },
                actions: {
                    edit: { isAccessible: false },
                    new: { isAccessible: false },
                },
                perPage: 200,
            },
        },
        {
            resource: Category,
            options: {
                properties: {
                    name: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    description: {
                        type: 'textarea',
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: true,
                        },
                    },
                    slug: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                    isActive: {
                        type: 'boolean',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: true,
                        },
                    },
                },
                actions: {
                    edit: { isAccessible: true },
                    new: { isAccessible: true },
                },
                perPage: 200,
            },
        },
        {
            resource: UploadedImage,
            options: {
                navigation: {
                    name: 'Media',
                    icon: 'Image',
                },
                properties: {
                    filename: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    originalName: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    url: {
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    size: {
                        type: 'number',
                        isVisible: {
                            list: true,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    mimetype: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    uploadedBy: {
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    isUsed: {
                        type: 'boolean',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    usedInProducts: {
                        reference: 'Product',
                        isArray: true,
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    tags: {
                        isArray: true,
                        isVisible: {
                            list: false,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                    description: {
                        isVisible: {
                            list: false,
                            filter: false,
                            show: true,
                            edit: false,
                        },
                    },
                    createdAt: {
                        type: 'datetime',
                        isVisible: {
                            list: true,
                            filter: true,
                            show: true,
                            edit: false,
                        },
                    },
                },
                actions: {
                    edit: { isAccessible: false },
                    new: { isAccessible: false },
                    delete: { isAccessible: false },
                },
                perPage: 50,
                sort: {
                    sortBy: 'createdAt',
                    direction: 'desc',
                },
            },
        },
    ],
    settings: {
        defaultPerPage: 200,
    },
    branding: {
        companyName: 'Grup Admin',
        logo: false,
        softwareBrothers: false,
    },
});

// Build and use a router which will handle all AdminJS routes
const router = AdminJSExpress.buildAuthenticatedRouter(
    adminJs,
    {
        authenticate: async (email, password) => {
            // Admin authentication with updated credentials
            if (email === 'adiazi@grup.com' && password === '12345678') {
                return { email: 'adiazi@grup.com', role: 'admin' };
            }
            return null;
        },
        cookieName: 'adminjs',
        cookiePassword: 'somepassword',
    },
    null,
    {
        store: MongoStore.create({
            mongoUrl:
                process.env.MONGODB_URI ||
                process.env.MONGO_URI ||
                'mongodb://localhost:27017/GRUP',
            collectionName: 'adminjs_sessions',
            ttl: 14 * 24 * 60 * 60, // 14 days
            autoRemove: 'native',
            touchAfter: 24 * 3600,
        }),
        secret:
            process.env.SESSION_SECRET || 'adminjs-session-secret-change-this',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        },
    }
);

export { adminJs, router };
