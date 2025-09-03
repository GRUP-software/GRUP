import Cart from '../models/cart.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import GroupBuy from '../models/GroupBuy.js';
import PaymentHistory from '../models/PaymentHistory.js';
import Order from '../models/order.js';
import { generateTrackingNumber } from '../utils/trackingGenerator.js';

import { nanoid } from 'nanoid';
import mongoose from 'mongoose';
import Product from '../models/Product.js'; // Import Product model
import { calculateBaseUnitQuantity } from '../utils/sellingUnitHelper.js';
import config from '../config/environment.js'; // Import environment configuration
import User from '../models/User.js';

// Flutterwave payment function - no encryption needed
const processFlutterwavePayment = async (flutterwaveData) => {
    try {
        // Send the payload without encryption for payment initialization
        // Flutterwave only requires encryption for card details, not payment initialization
        const response = await fetch(
            'https://api.flutterwave.com/v3/payments',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.FLUTTERWAVE.SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(flutterwaveData),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Flutterwave API error: ${response.status} - ${errorText}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error('❌ Flutterwave payment error:', error);
        throw error;
    }
};

// Import formatCartItems function from cartController
const formatCartItems = (cartItems) => {
    return cartItems.map((item) => ({
        _id: item._id,
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        variant: item.variant,
        sellingUnit: item.sellingUnit,
        itemPrice: item.unitPrice || item.price,
    }));
};

// Helper function to create order after successful payment
const createOrderFromPayment = async (paymentHistory) => {
    try {
        const trackingNumber = generateTrackingNumber();

        // Convert PaymentHistory cartItems to Order items format
        const orderItems = paymentHistory.cartItems.map((item) => ({
            product: item.productId,
            quantity: item.quantity,
            price: item.price,
            groupbuyId: null, // Will be populated when GroupBuys are linked
            groupStatus: 'forming',
        }));

        const order = new Order({
            trackingNumber,
            paymentHistoryId: paymentHistory._id,
            user: paymentHistory.userId,
            items: orderItems,
            currentStatus: 'groups_forming',
            deliveryAddress: paymentHistory.metadata?.deliveryAddress || {},
            totalAmount: paymentHistory.amount,
            walletUsed: paymentHistory.walletUsed,
            flutterwaveAmount: paymentHistory.flutterwaveAmount,
            progress: [
                {
                    status: 'groups_forming',
                    message:
                        'Order created successfully. Groups are forming for your items.',
                    timestamp: new Date(),
                },
            ],
        });

        await order.save();

        // Update PaymentHistory with order reference
        paymentHistory.orderId = order._id;
        await paymentHistory.save();

        return order;
    } catch (error) {
        console.error('❌ Error creating order from payment:', error);
        throw error;
    }
};

// Helper function to link order items to group buys
const linkOrderToGroupBuys = async (order, groupBuys) => {
    try {
        // Create a map of productId to groupBuy for quick lookup
        const productGroupBuyMap = {};
        groupBuys.forEach((gb) => {
            productGroupBuyMap[gb.productId.toString()] = gb;
        });

        // Update order items with groupBuy references
        let orderUpdated = false;
        order.items.forEach((item) => {
            const productId = item.product.toString();
            if (productGroupBuyMap[productId]) {
                item.groupbuyId = productGroupBuyMap[productId]._id;
                item.groupStatus =
                    productGroupBuyMap[productId].status === 'successful'
                        ? 'secured'
                        : 'forming';
                orderUpdated = true;
            }
        });

        if (orderUpdated) {
            order.checkAllGroupsSecured();
            order.calculatePriorityScore();
            await order.save();
        }
    } catch (error) {
        console.error('❌ Error linking order to group buys:', error);
    }
};

// Enhanced helper function to process group buys after successful payment with race condition protection
export const processGroupBuys = async (paymentHistory) => {
    const groupBuys = [];

    try {
        for (const item of paymentHistory.cartItems) {
            const itemAmount = item.price * item.quantity;

            // Ensure proper ObjectId conversion
            const userId = new mongoose.Types.ObjectId(paymentHistory.userId);
            const paymentHistoryId = new mongoose.Types.ObjectId(
                paymentHistory._id
            );
            const productId = new mongoose.Types.ObjectId(item.productId);

            let groupBuy = null;
            let isNewGroupBuy = false;

            // Try to find existing active GroupBuy for this product
            try {
                groupBuy = await GroupBuy.findOne({
                    productId: productId,
                    status: { $in: ['active', 'successful'] },
                    expiresAt: { $gt: new Date() },
                });

                if (groupBuy) {
                    // Calculate correct group buy quantity based on selling units
                    const groupBuyQuantity = calculateBaseUnitQuantity(item);

                    console.log(`🔍 Group Buy Debug for product ${productId}:`);
                    console.log(`   Cart item:`, JSON.stringify(item, null, 2));
                    console.log(`   Selling unit data:`, item.sellingUnit);
                    console.log(`   Cart quantity: ${item.quantity}`);
                    console.log(
                        `   Base unit quantity: ${item.sellingUnit?.baseUnitQuantity || 'N/A'}`
                    );
                    console.log(
                        `   Calculated base units: ${groupBuyQuantity}`
                    );
                    console.log(`   Item amount: ${itemAmount}`);
                    console.log(
                        `   Using quantity for group buy: ${groupBuyQuantity}`
                    );

                    // Update existing GroupBuy using the model method
                    groupBuy.addOrUpdateParticipant(
                        userId,
                        groupBuyQuantity,
                        itemAmount,
                        paymentHistoryId
                    );
                    await groupBuy.save();
                }
            } catch (error) {
                console.error(
                    `❌ Error finding/updating existing GroupBuy:`,
                    error
                );
                groupBuy = null;
            }

            // If no existing GroupBuy found, create new one
            if (!groupBuy) {
                try {
                    const product = await Product.findById(productId);
                    if (!product) {
                        throw new Error(`Product not found: ${productId}`);
                    }

                    const productMVU = product.minimumViableUnits ?? 20;

                    // Calculate correct group buy quantity based on selling units
                    const groupBuyQuantity = calculateBaseUnitQuantity(item);

                    // Validate participant data before creating GroupBuy
                    const participantData = {
                        userId: userId,
                        quantity: Number(groupBuyQuantity), // Use calculated base unit quantity
                        amount: Number(itemAmount),
                        paymentHistories: [paymentHistoryId],
                        joinedAt: new Date(),
                    };

                    // Validate required fields
                    if (!participantData.userId) {
                        throw new Error('Participant userId is required');
                    }
                    if (
                        !participantData.quantity ||
                        participantData.quantity <= 0
                    ) {
                        throw new Error(
                            'Participant quantity must be a positive number'
                        );
                    }
                    if (
                        !participantData.amount ||
                        participantData.amount <= 0
                    ) {
                        throw new Error(
                            'Participant amount must be a positive number'
                        );
                    }

                    const groupBuyData = {
                        productId: productId,
                        minimumViableUnits: productMVU, // Use product's MVU instead of hardcoded 20
                        unitsSold: Number(groupBuyQuantity), // Use calculated base unit quantity
                        totalAmountCollected: Number(itemAmount),
                        status: 'active',
                        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
                        participants: [participantData],
                        paymentHistories: [paymentHistoryId],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };

                    groupBuy = new GroupBuy(groupBuyData);

                    // Validate before saving
                    const validationError = groupBuy.validateSync();
                    if (validationError) {
                        console.error(
                            `❌ GroupBuy validation failed:`,
                            validationError.errors
                        );
                        throw validationError;
                    }

                    await groupBuy.save();
                    isNewGroupBuy = true;
                } catch (error) {
                    console.error(`❌ Error creating new GroupBuy:`, {
                        message: error.message,
                        errors: error.errors,
                        stack: error.stack,
                    });

                    // Handle potential duplicate key error (race condition)
                    if (error.code === 11000) {
                        groupBuy = await GroupBuy.findOne({
                            productId: productId,
                            status: { $in: ['active', 'successful'] },
                            expiresAt: { $gt: new Date() },
                        });

                        if (groupBuy) {
                            // Calculate correct group buy quantity based on selling units
                            const groupBuyQuantity =
                                calculateBaseUnitQuantity(item);

                            groupBuy.addOrUpdateParticipant(
                                userId,
                                groupBuyQuantity,
                                itemAmount,
                                paymentHistoryId
                            );
                            await groupBuy.save();
                        } else {
                            throw new Error(
                                `Failed to create or find GroupBuy for product ${productId}`
                            );
                        }
                    } else {
                        throw error;
                    }
                }
            }

            if (groupBuy) {
                groupBuys.push(groupBuy);

                // Emit WebSocket event for real-time updates
                const io = global.io;
                if (io) {
                    io.emit('groupBuyUpdate', {
                        productId: item.productId,
                        groupBuyId: groupBuy._id,
                        unitsSold: groupBuy.unitsSold,
                        status: groupBuy.status,
                        participants: groupBuy.participants.length,
                        minimumViableUnits: groupBuy.minimumViableUnits,
                        progressPercentage: groupBuy.getProgressPercentage(),
                        totalAmountCollected: groupBuy.totalAmountCollected,
                        isNewGroupBuy: isNewGroupBuy,
                    });
                }
            }
        }

        // Update payment history with created/joined group buys
        if (groupBuys.length > 0) {
            paymentHistory.groupBuysCreated = groupBuys.map((gb) => gb._id);
            await paymentHistory.save();
        }

        return groupBuys;
    } catch (error) {
        console.error(`❌ Error in processGroupBuys:`, {
            message: error.message,
            stack: error.stack,
            paymentHistoryId: paymentHistory._id,
        });
        throw error;
    }
};

// Helper function to process wallet-only payments
const processWalletOnlyPayment = async (paymentHistory, walletUse, res) => {
    let wallet = null;
    let originalBalance = 0;
    const transaction = null;

    try {
        // Validate wallet balance with optimistic locking
        wallet = await Wallet.findOne({ user: paymentHistory.userId });
        if (!wallet) {
            console.error(
                `❌ Wallet not found for user: ${paymentHistory.userId}`
            );
            return res.status(400).json({
                message: 'Wallet not found',
                details:
                    'Your wallet account could not be found. Please contact support if this issue persists.',
                userId: paymentHistory.userId,
            });
        }

        // Store original balance for rollback
        originalBalance = wallet.balance;

        // Validate wallet use amount
        if (walletUse <= 0) {
            return res.status(400).json({
                message: 'Invalid wallet amount',
                details: 'Wallet amount must be greater than zero',
                walletUse: walletUse,
                totalAmount: paymentHistory.amount,
            });
        }

        if (walletUse > paymentHistory.amount) {
            return res.status(400).json({
                message: 'Invalid wallet amount',
                details: 'Wallet amount cannot exceed the total order amount',
                walletUse: walletUse,
                totalAmount: paymentHistory.amount,
                maxAllowed: paymentHistory.amount,
            });
        }

        // Check if wallet balance is sufficient
        if (wallet.balance < walletUse) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                details: `Your wallet balance (₦${wallet.balance}) is insufficient for this transaction (₦${walletUse})`,
                wallet: {
                    currentBalance: wallet.balance,
                    requiredAmount: walletUse,
                    shortfall: walletUse - wallet.balance,
                },
                suggestions: [
                    'Add more funds to your wallet',
                    'Use a smaller wallet amount',
                    'Pay the full amount via Flutterwave',
                ],
            });
        }

        // Update payment history with wallet usage
        paymentHistory.walletUsed = walletUse;
        paymentHistory.flutterwaveAmount = 0;
        await paymentHistory.save();

        // Deduct the amount from wallet
        const newWalletBalance = wallet.balance - walletUse;
        wallet.balance = newWalletBalance;
        await wallet.save();

        // Process group buys first
        const groupBuys = await processGroupBuys(paymentHistory);

        // Create Order
        const order = await createOrderFromPayment(paymentHistory);
        await linkOrderToGroupBuys(order, groupBuys);

        // Create wallet transaction record with proper validation (now order exists)
        const transactionData = {
            wallet: wallet._id,
            user: paymentHistory.userId,
            type: 'debit',
            amount: walletUse,
            reason: 'ORDER',
            description: `Wallet used for payment ${paymentHistory.referenceId}`,
            metadata: {
                paymentHistoryId: paymentHistory._id,
                orderId: order._id,
                groupBuyId: groupBuys?.[0]?._id, // First group buy if any
                isWalletOnlyPayment: true,
            },
        };

        // Validate transaction data before creating
        const transaction = new Transaction(transactionData);
        const validationError = transaction.validateSync();
        if (validationError) {
            console.error(
                '❌ Transaction validation failed:',
                validationError.errors
            );
            return res.status(500).json({
                message: 'Transaction creation failed',
                details:
                    'Failed to create transaction record due to validation errors',
                error: validationError.message,
                validationErrors: validationError.errors,
            });
        }

        await transaction.save();

        // Send wallet update notification
        try {
            const notificationService = (
                await import('../services/notificationService.js')
            ).default;
            await notificationService.notifyWalletUpdate(
                paymentHistory.userId,
                originalBalance,
                newWalletBalance,
                'Order payment',
                transaction._id
            );
        } catch (error) {
            console.error('Failed to send wallet update notification:', error);
        }

        // Mark payment as paid
        paymentHistory.status = 'paid';
        await paymentHistory.save();

        // Clear user's cart
        try {
            const existingCart = await Cart.findOne({
                user: paymentHistory.userId,
            });
            if (existingCart) {
                existingCart.items = [];
                await existingCart.save();
            }
        } catch (cartError) {
            console.error('Failed to clear cart:', cartError.message);
        }

        // Send payment success notification
        try {
            const notificationService = (
                await import('../services/notificationService.js')
            ).default;
            await notificationService.notifyPaymentSuccess(
                paymentHistory.userId,
                paymentHistory.amount,
                'wallet',
                order._id
            );

            // Send order creation notification (receipt)
            await notificationService.notifyOrderCreated(
                paymentHistory.userId,
                {
                    orderId: order._id,
                    trackingNumber: order.trackingNumber,
                    totalAmount: paymentHistory.amount,
                    groupBuysJoined: groupBuys.length,
                }
            );
        } catch (error) {
            console.error(
                'Failed to send payment success notification:',
                error
            );
        }

        // Emit social proof notification to all users
        try {
            const io = global.io;
            if (io && groupBuys.length > 0) {
                const User = (await import('../models/User.js')).default;
                const user = await User.findById(paymentHistory.userId).select(
                    'firstName lastName'
                );

                if (user) {
                    // Get the first product from group buys for social proof
                    const Product = (await import('../models/Product.js'))
                        .default;
                    const product = await Product.findById(
                        groupBuys[0].productId
                    ).select('title');

                    if (product) {
                        // Anonymize user name (show only first name)
                        const displayName = user.firstName || 'Someone';
                        const productName = product.title || 'a product';

                        io.emit('purchase:social_proof', {
                            userName: displayName,
                            productName: productName,
                            timestamp: new Date(),
                            purchaseId: paymentHistory._id,
                        });

                        console.log(
                            `✅ Social proof emitted: ${displayName} joined groupbuy for ${productName}`
                        );
                    }
                }
            }
        } catch (socialProofError) {
            console.error(`❌ Error emitting social proof:`, socialProofError);
            // Don't fail the payment if social proof fails
        }

        res.json({
            success: true,
            message: 'Payment completed successfully using wallet',
            paymentId: paymentHistory._id,
            orderId: order._id,
            trackingNumber: order.trackingNumber,
            groupBuysJoined: groupBuys.length,
            walletUsed: walletUse,
            totalAmount: paymentHistory.amount,
            newWalletBalance: newWalletBalance,
            groupBuys: groupBuys.map((gb) => ({
                id: gb._id,
                productId: gb.productId,
                status: gb.status,
                unitsSold: gb.unitsSold,
                minimumViableUnits: gb.minimumViableUnits,
            })),
        });
    } catch (error) {
        // Rollback wallet deduction if payment failed
        if (wallet && originalBalance > 0) {
            try {
                wallet.balance = originalBalance;
                await wallet.save();

                // Delete transaction record if it was created
                if (transaction && transaction._id) {
                    await Transaction.findByIdAndDelete(transaction._id);
                }

                // Reset payment history status
                paymentHistory.status = 'pending';
                paymentHistory.walletUsed = 0;
                await paymentHistory.save();
            } catch (rollbackError) {
                console.error(
                    '❌ Failed to rollback wallet deduction:',
                    rollbackError
                );
            }
        }

        console.error('❌ Wallet-only payment processing error:', error);
        res.status(500).json({
            message: 'Payment processing failed',
            error: error.message,
            details:
                'Your wallet has been restored to its original balance. Please try again.',
        });
    }
};

// Process partial wallet + Flutterwave payment
const processPartialWalletPayment = async (
    paymentHistory,
    user,
    walletUse,
    callback_url,
    res
) => {
    try {
        // Validate wallet balance (but don't deduct yet!)
        const wallet = await Wallet.findOne({ user: paymentHistory.userId });
        if (!wallet) {
            return res
                .status(400)
                .json({ message: 'Wallet not found for user.' });
        }

        // Validate wallet use amount
        if (walletUse <= 0 || walletUse > paymentHistory.amount) {
            return res.status(400).json({
                message: 'Invalid wallet use amount for partial payment',
            });
        }

        // 🔧 FIX: Simple wallet balance validation (no sessions needed for validation)
        // The actual wallet deduction will happen in the webhook after Flutterwave success
        if (wallet.balance < walletUse) {
            return res.status(400).json({
                message: 'Insufficient wallet balance',
                details: `Your wallet balance (₦${wallet.balance}) is insufficient for this transaction (₦${walletUse})`,
                wallet: {
                    currentBalance: wallet.balance,
                    requiredAmount: walletUse,
                    shortfall: walletUse - wallet.balance,
                },
                suggestions: [
                    'Add more funds to your wallet',
                    'Use a smaller wallet amount',
                    'Pay the full amount via Flutterwave',
                ],
            });
        }

        // Calculate remaining amount for Flutterwave
        const flutterwaveAmount = paymentHistory.amount - walletUse;

        // Update payment history with wallet usage info (but don't deduct yet!)
        paymentHistory.walletUsed = walletUse;
        paymentHistory.flutterwaveAmount = flutterwaveAmount;
        paymentHistory.status = 'pending'; // Keep as pending until Flutterwave succeeds
        await paymentHistory.save();

        // Initialize Flutterwave payment for remaining amount
        const flutterwaveData = {
            amount: paymentHistory.amount,
            tx_ref: paymentHistory.referenceId,
            customer: {
                email: user.email,
                name: user.name,
                phone_number: user.phone,
            },
            redirect_url: `${process.env.FRONTEND_URL}/account`,
            metadata: {
                userId: paymentHistory.userId,
                paymentHistoryId: paymentHistory._id.toString(),
                walletUsed: walletUse,
                totalAmount: paymentHistory.amount,
                cartId: paymentHistory.cartId,
                custom_fields: [
                    {
                        display_name: 'Payment ID',
                        variable_name: 'payment_id',
                        value: paymentHistory._id.toString(),
                    },
                    {
                        display_name: 'Wallet Use',
                        variable_name: 'wallet_use',
                        value: walletUse.toString(),
                    },
                ],
            },
        };

        // Check if Flutterwave secret key is configured
        if (!config.FLUTTERWAVE.SECRET_KEY) {
            console.error('❌ FLUTTERWAVE_SECRET_KEY is not configured');
            return res.status(500).json({
                success: false,
                message: 'Payment service configuration error',
                details:
                    'Payment gateway is not properly configured. Please contact support.',
                error: 'FLUTTERWAVE_SECRET_KEY not found',
            });
        }

        // Send the payload without encryption for payment initialization
        // Flutterwave only requires encryption for card details, not payment initialization
        const response = await fetch(
            'https://api.flutterwave.com/v3/payments',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.FLUTTERWAVE.SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(flutterwaveData),
            }
        );

        if (!response.ok) {
            console.error(
                `❌ Flutterwave API error: ${response.status} ${response.statusText}`
            );
            const errorText = await response.text();
            console.error(`❌ Flutterwave error details: ${errorText}`);

            return res.status(500).json({
                success: false,
                message: 'Payment service temporarily unavailable',
                details:
                    'Unable to connect to payment gateway. Please try again later.',
                error: `Flutterwave API error: ${response.status}`,
                suggestions: [
                    'Check your internet connection',
                    'Try again in a few minutes',
                    'Contact support if the issue persists',
                ],
            });
        }

        const data = await response.json();

        if (data.status) {
            // Update payment history with Flutterwave reference
            paymentHistory.flutterwaveReference = data.data.reference;
            await paymentHistory.save();

            res.json({
                success: true,
                message:
                    'Partial wallet payment initialized, redirecting to Flutterwave',
                authorization_url: data.data.authorization_url,
                reference: paymentHistory.referenceId,
                paymentHistoryId: paymentHistory._id,
                walletUse: walletUse,
                flutterwaveAmount: flutterwaveAmount,
                totalAmount: paymentHistory.amount,
                currentWalletBalance: wallet.balance, // Show current balance (not deducted yet)
                message:
                    'Wallet balance will be deducted after Flutterwave payment succeeds',
            });
        } else {
            // No wallet deduction needed since we didn't deduct anything

            res.status(400).json({
                success: false,
                message: 'Failed to initialize Flutterwave payment',
                details:
                    'Unable to connect to payment gateway. Please try again or contact support.',
                error: data.message,
                walletDeduction: 'none', // Clarify no wallet was deducted
                suggestions: [
                    'Check your internet connection',
                    'Try again in a few minutes',
                    'Contact support if the issue persists',
                ],
            });
        }
    } catch (error) {
        console.error('❌ Partial wallet payment processing error:', error);
        res.status(500).json({
            message: 'Payment processing failed',
            details:
                'An unexpected error occurred while processing your payment. Please try again.',
            error: error.message,
            suggestions: [
                'Refresh the page and try again',
                'Check your payment details',
                'Contact support if the issue persists',
            ],
        });
    }
};

// Process Flutterwave-only payment (existing logic)
const processFlutterwaveOnlyPayment = async (
    paymentHistory,
    user,
    callback_url,
    res
) => {
    try {
        // Debug: Log configuration
        console.log('🔍 Debug - Config object:', {
            hasConfig: !!config,
            hasFlutterwave: !!config?.FLUTTERWAVE,
            secretKey: config?.FLUTTERWAVE?.SECRET_KEY ? 'SET' : 'NOT SET',
            configKeys: Object.keys(config || {}),
        });

        // Initialize Flutterwave payment
        const flutterwaveData = {
            amount: paymentHistory.amount,
            tx_ref: paymentHistory.referenceId,
            customer: {
                email: user.email,
                name: user.name,
                phone_number: user.phone,
            },
            redirect_url: `${process.env.FRONTEND_URL}/account`,

            // callback_url:
            //     callback_url || `${process.env.FRONTEND_URL}/payment/callback`,
            // metadata: {
            //     userId: paymentHistory.userId,
            //     paymentHistoryId: paymentHistory._id.toString(),
            //     walletUsed: 0,
            //     custom_fields: [
            //         {
            //             display_name: 'Payment ID',
            //             variable_name: 'payment_id',
            //             value: paymentHistory._id.toString(),
            //         },
            //     ],
            // },
        };

        // Check if Flutterwave secret key is configured
        if (!config.FLUTTERWAVE.SECRET_KEY) {
            console.error('❌ FLUTTERWAVE_SECRET_KEY is not configured');
            return res.status(500).json({
                success: false,
                message: 'Payment service configuration error',
                details:
                    'Payment gateway is not properly configured. Please contact support.',
                error: 'FLUTTERWAVE_SECRET_KEY not found',
            });
        }

        // Process Flutterwave payment using the new function
        const data = await processFlutterwavePayment(flutterwaveData);

        if (data.status) {
            // Update payment history with Flutterwave reference
            paymentHistory.flutterwaveReference = data.data.reference;
            await paymentHistory.save();

            console.log(`🔍 Flutterwave Payment Debug:`);
            console.log(`   Internal Reference: ${paymentHistory.referenceId}`);
            console.log(`   Flutterwave Reference: ${data.data.reference}`);
            console.log(`   PaymentHistory ID: ${paymentHistory._id}`);

            res.json({
                success: true,
                authorization_url: data.data.link,
                reference: paymentHistory.referenceId,
                paymentHistoryId: paymentHistory._id,
                amount: paymentHistory.amount,
                walletUsed: 0,
                totalAmount: paymentHistory.amount,
                message: 'Payment initialized successfully',
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to initialize payment',
                details:
                    'Unable to connect to payment gateway. Please try again or contact support.',
                error: data.message,
                suggestions: [
                    'Check your internet connection',
                    'Try again in a few minutes',
                    'Contact support if the issue persists',
                ],
            });
        }
    } catch (error) {
        console.error('❌ Flutterwave-only payment processing error:', error);
        res.status(500).json({
            message: 'Payment processing failed',
            details:
                'An unexpected error occurred while processing your payment. Please try again.',
            error: error.message,
            suggestions: [
                'Refresh the page and try again',
                'Check your payment details',
                'Contact support if the issue persists',
            ],
        });
    }
};

export const initializePayment = async (req, res) => {
    try {
        const {
            deliveryAddress,
            phone,
            useWallet,
            cartId,
            callback_url,
            paymentMethod = 'flutterwave_only', // New: payment method parameter
            walletUse = 0, // New: explicit wallet amount
        } = req.body;
        const userId = req.user.id;

        // Validate delivery address
        if (!deliveryAddress) {
            return res.status(400).json({
                message: 'Delivery address is required',
                details:
                    'Please provide a complete delivery address including street, city, and state',
            });
        }

        if (
            !deliveryAddress.street ||
            !deliveryAddress.city ||
            !deliveryAddress.state
        ) {
            const missingFields = [];
            if (!deliveryAddress.street) missingFields.push('street');
            if (!deliveryAddress.city) missingFields.push('city');
            if (!deliveryAddress.state) missingFields.push('state');

            return res.status(400).json({
                message: `Incomplete delivery address`,
                details: `Missing required fields: ${missingFields.join(', ')}`,
                required: ['street', 'city', 'state'],
            });
        }

        // Validate phone number
        if (!phone) {
            return res.status(400).json({
                message: 'Phone number is required',
                details:
                    'Please provide a valid phone number for delivery contact',
            });
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                message: 'Invalid phone number format',
                details:
                    'Please provide a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)',
            });
        }

        // Validate cart
        if (!cartId) {
            return res.status(400).json({
                message: 'Cart ID is required',
                details:
                    'Please provide a valid cart ID to proceed with checkout',
            });
        }

        const cart = await Cart.findById(cartId).populate('items.product');
        if (!cart) {
            return res.status(404).json({
                message: 'Cart not found',
                details:
                    'The specified cart does not exist or may have been deleted',
                cartId: cartId,
            });
        }

        if (cart.user.toString() !== userId) {
            return res.status(403).json({
                message: 'Access denied',
                details:
                    'This cart belongs to another user. You can only checkout your own cart',
                cartId: cartId,
                cartOwner: cart.user.toString(),
                currentUser: userId,
            });
        }

        if (cart.items.length === 0) {
            return res.status(400).json({
                message: 'Empty cart',
                details:
                    'Cannot checkout with an empty cart. Please add items to your cart before proceeding',
                cartId: cartId,
            });
        }

        let totalPrice = 0;
        const cartItems = [];

        console.log('🔍 Initialize Payment Debug - Cart items:');
        cart.items.forEach((item, index) => {
            console.log(`   Item ${index + 1}:`, {
                productId: item.product._id,
                quantity: item.quantity,
                sellingUnit: item.sellingUnit,
                sellingUnitType: typeof item.sellingUnit,
                sellingUnitKeys: item.sellingUnit
                    ? Object.keys(item.sellingUnit)
                    : 'N/A',
                unitPrice: item.unitPrice,
                hasSellingUnit: !!item.sellingUnit,
                baseUnitQuantity: item.sellingUnit?.baseUnitQuantity,
            });
        });

        for (const item of cart.items) {
            const product = item.product;
            const quantity = item.quantity;

            if (!product) {
                return res.status(400).json({
                    message: 'Invalid product in cart',
                    details:
                        'One or more products in your cart are no longer available or have been removed',
                    cartItemId: item._id,
                    productId: item.product,
                });
            }

            if (product.stock < quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for ${product.title}`,
                    details: `Only ${product.stock} units available, but you're trying to purchase ${quantity}`,
                    product: {
                        id: product._id,
                        title: product.title,
                        availableStock: product.stock,
                        requestedQuantity: quantity,
                    },
                });
            }

            // Use stored selling unit price if available, otherwise fall back to product price
            let itemPrice = item.unitPrice || product.price;
            if (item.sellingUnit && product.sellingUnits?.enabled) {
                itemPrice =
                    item.sellingUnit.pricePerUnit ||
                    item.unitPrice ||
                    product.price;
            }

            const itemTotal = itemPrice * quantity;
            totalPrice += itemTotal;

            const cartItemData = {
                productId: product._id,
                quantity: quantity,
                price: itemPrice, // Store the actual selling unit price
            };

            // Check if sellingUnit exists and has valid data
            if (
                item.sellingUnit &&
                item.sellingUnit !== null &&
                item.sellingUnit !== undefined &&
                typeof item.sellingUnit === 'object' &&
                item.sellingUnit.optionName &&
                item.sellingUnit.baseUnitQuantity
            ) {
                // Extract only the required sellingUnit properties to match PaymentHistory schema
                cartItemData.sellingUnit = {
                    optionName: item.sellingUnit.optionName,
                    displayName: item.sellingUnit.displayName,
                    baseUnitQuantity: item.sellingUnit.baseUnitQuantity,
                    baseUnitName: item.sellingUnit.baseUnitName,
                    pricePerUnit: item.sellingUnit.pricePerUnit,
                    originalPricePerUnit: item.sellingUnit.originalPricePerUnit,
                    totalBaseUnits: item.sellingUnit.totalBaseUnits,
                    savingsPerUnit: item.sellingUnit.savingsPerUnit,
                };
            }

            console.log(
                '🔍 Initialize Payment Debug - Cart item being saved:',
                cartItemData
            );
            cartItems.push(cartItemData);
        }

        // Generate unique reference
        const referenceId = `GRP_${nanoid(10)}_${Date.now()}`;

        // Create PaymentHistory
        const paymentHistory = new PaymentHistory({
            userId,
            referenceId,
            cartItems,
            amount: totalPrice,
            walletUsed: 0, // Will be set based on payment method
            flutterwaveAmount: totalPrice, // Will be set based on payment method
            status: 'pending',
            metadata: {
                deliveryAddress: {
                    street: deliveryAddress.street,
                    city: deliveryAddress.city,
                    state: deliveryAddress.state,
                    phone: phone,
                },
                paymentMethod: paymentMethod,
            },
        });

        await paymentHistory.save();

        const user = await User.findById(userId);

        // Route based on payment method
        if (paymentMethod === 'wallet_only') {
            console.log('using wallet only');
            return await processWalletOnlyPayment(
                paymentHistory,
                walletUse,
                res
            );
        } else if (paymentMethod === 'wallet_and_flutterwave') {
            console.log('wallet_and_flutterwave');

            return await processPartialWalletPayment(
                paymentHistory,
                user,
                walletUse,
                callback_url,
                res
            );
        } else {
            // Default: flutterwave_only
            console.log('using flutterwave only');

            return await processFlutterwaveOnlyPayment(
                paymentHistory,
                user,
                callback_url,
                res
            );
        }
    } catch (error) {
        console.error('❌ Payment initialization error:', error);
        res.status(500).json({
            message: 'Payment initialization failed',
            details:
                'An unexpected error occurred while initializing your payment. Please try again.',
            error: error.message,
            suggestions: [
                'Refresh the page and try again',
                'Check your payment details',
                'Contact support if the issue persists',
            ],
        });
    }
};

export const handleFlutterwaveWebhook = async (req, res) => {
    try {
        const event = req.body;
        const secretHash = process.env.FLUTTERWAVE_SECRET_KEY;
        const signature = req.headers['verif-hash'];

        if (!signature || signature !== secretHash) {
            console.error('❌ Invalid webhook signature');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        if (event.event === 'charge.completed') {
            const { reference, metadata } = event.data;

            // Find PaymentHistory by reference (not Order)
            const paymentHistory = await PaymentHistory.findOne({
                referenceId: reference,
            });

            if (!paymentHistory) {
                console.error(
                    `❌ PaymentHistory not found for reference: ${reference}`
                );
                return res
                    .status(404)
                    .json({ message: 'Payment history not found' });
            }

            if (paymentHistory.status === 'paid') {
                return res
                    .status(200)
                    .json({ message: 'Payment already processed' });
            }

            paymentHistory.status = 'paid';
            paymentHistory.flutterwaveReference = reference;
            await paymentHistory.save();

            // Process group buys first
            const groupBuys = await processGroupBuys(paymentHistory);

            // Create Order AFTER payment confirmation
            const order = await createOrderFromPayment(paymentHistory);

            // Link order to group buys
            await linkOrderToGroupBuys(order, groupBuys);

            // Handle wallet deduction if applicable (now order and groupBuys exist)
            if (paymentHistory.walletUsed > 0) {
                const wallet = await Wallet.findOne({
                    user: paymentHistory.userId,
                });
                if (wallet) {
                    wallet.balance -= paymentHistory.walletUsed;
                    await wallet.save();

                    await Transaction.create({
                        wallet: wallet._id,
                        user: paymentHistory.userId,
                        type: 'debit',
                        amount: paymentHistory.walletUsed,
                        reason: 'ORDER',
                        description: `Wallet used for payment ${paymentHistory.referenceId}`,
                        metadata: {
                            paymentHistoryId: paymentHistory._id,
                            orderId: order._id,
                            groupBuyId: groupBuys?.[0]?._id, // First group buy if any
                        },
                    });
                }
            }

            // Clear user's cart
            try {
                const existingCart = await Cart.findOne({
                    user: paymentHistory.userId,
                });
                if (existingCart) {
                    existingCart.items = [];
                    await existingCart.save();
                }
            } catch (cartError) {
                console.error('Failed to clear cart:', cartError.message);
            }

            // Send payment success notification
            try {
                const notificationService = (
                    await import('../services/notificationService.js')
                ).default;
                await notificationService.notifyPaymentSuccess(
                    paymentHistory.userId,
                    paymentHistory.amount,
                    'flutterwave',
                    order._id
                );

                // Send order creation notification (receipt)
                await notificationService.notifyOrderCreated(
                    paymentHistory.userId,
                    {
                        orderId: order._id,
                        trackingNumber: order.trackingNumber,
                        totalAmount: paymentHistory.amount,
                        groupBuysJoined: groupBuys.length,
                    }
                );
            } catch (error) {
                console.error(
                    'Failed to send payment success notification:',
                    error
                );
            }
        }

        res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ message: 'Webhook processing failed' });
    }
};

// Get user's payment history
export const getUserPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const payments = await PaymentHistory.find({ userId })
            .populate('orderId', 'trackingNumber currentStatus')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await PaymentHistory.countDocuments({ userId });

        res.json({
            success: true,
            data: payments,
            pagination: {
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            message: 'Error fetching payment history',
            details:
                'An error occurred while retrieving your payment history. Please try again.',
            error: error.message,
            suggestions: [
                'Refresh the page and try again',
                'Check your internet connection',
                'Contact support if the issue persists',
            ],
        });
    }
};
