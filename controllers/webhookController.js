import crypto from 'crypto';
import PaymentHistory from '../models/PaymentHistory.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Order from '../models/order.js';
import Cart from '../models/cart.js'; // Import Cart model
import { generateTrackingNumber } from '../utils/trackingGenerator.js';
import logger from '../utils/logger.js';
import { processGroupBuys } from './paymentController.js';
import notificationService from '../services/notificationService.js';
import { processWalletDebit } from '../utils/walletTransactionService.js';
import { invalidateWalletCache } from '../utils/cacheManager.js';
import config from '../config/environment.js'; // Import environment configuration

// Helper function to create order after successful payment
const createOrderFromPayment = async (paymentHistory) => {
    try {
        console.log(`Creating order for PaymentHistory: ${paymentHistory._id}`);

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

        console.log(
            `✅ Order created: ${trackingNumber} for PaymentHistory: ${paymentHistory._id}`
        );
        return order;
    } catch (error) {
        console.error('❌ Error creating order from payment:', error);
        throw error;
    }
};

// Helper function to link order items to group buys
const linkOrderToGroupBuys = async (order, groupBuys) => {
    try {
        console.log(
            `Linking order ${order.trackingNumber} to ${groupBuys.length} GroupBuys`
        );

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
            console.log(`✅ Order ${order.trackingNumber} linked to GroupBuys`);
        }
    } catch (error) {
        console.error('❌ Error linking order to group buys:', error);
    }
};

// Flutterwave webhook handler
export const handleFlutterwaveWebhook = async (req, res) => {
    try {
        console.log('🔔 Webhook received:', req.body);

        const secretHash = process.env.FLUTTERWAVE_SECRET_KEY;
        const signature = req.headers['verif-hash'];

        if (!signature || signature !== secretHash) {
            console.error('❌ Invalid webhook signature');
            return res.status(400).json({ message: 'Invalid signature' });
        }

        const event = req.body;

        if (event.event === 'charge.completed') {
            await handleSuccessfulCharge(event.data);
        } else if (event.event === 'charge.failed') {
            await handleFailedCharge(event.data);
        }

        res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
        logger.error('Flutterwave webhook error:', error);
        res.status(500).json({
            message: 'Webhook processing failed',
            details:
                'An error occurred while processing the payment webhook. The payment may still be processed.',
            error: error.message,
        });
    }
};

const handleSuccessfulCharge = async (data) => {
    try {
        const { tx_ref, amount, status, metadata } = data;

        console.log(`🔍 Webhook Debug:`);
        console.log(`   Reference: ${tx_ref}`);
        console.log(`   Amount: ${amount}`);
        console.log(`   Status: ${status}`);

        // Find payment history by Flutterwave reference
        console.log(`🔍 Looking for payment history with referenxe: ${tx_ref}`);
        const paymentHistory = await PaymentHistory.findOne({
            flutterwaveReference: tx_ref,
        });
        if (!paymentHistory) {
            logger.error(`Payment history not found for reference: ${tx_ref}`);
            console.error(
                `❌ Payment history not found for reference: ${tx_ref}`
            );

            // Try to find by referenceId as fallback
            console.log(`🔍 Trying to find by referenceId: ${tx_ref}`);
            const fallbackPayment = await PaymentHistory.findOne({
                referenceId: tx_ref,
            });
            if (fallbackPayment) {
                console.log(
                    `✅ Found payment by referenceId: ${fallbackPayment._id}`
                );
                // Update the flutterwaveReference
                fallbackPayment.flutterwaveReference = tx_ref;
                await fallbackPayment.save();
                console.log(
                    `✅ Updated flutterwaveReference for payment: ${fallbackPayment._id}`
                );
                return await handleSuccessfulCharge({
                    ...data,
                    reference: fallbackPayment.referenceId,
                });
            }

            console.error(
                `🔍 Available references in database:`,
                await PaymentHistory.distinct('referenceId')
            );
            console.error(
                `🔍 Available flutterwave references in database:`,
                await PaymentHistory.distinct('flutterwaveReference')
            );
            return;
        }

        console.log(`✅ Found payment history: ${paymentHistory._id}`);
        console.log(`   Wallet used: ₦${paymentHistory.walletUsed}`);
        console.log(
            `   Flutterwave amount: ₦${paymentHistory.flutterwaveAmount}`
        );
        console.log(`   Total amount: ₦${paymentHistory.amount}`);
        console.log(`   Status: ${paymentHistory.status}`);

        if (paymentHistory.status === 'paid') {
            logger.info(`Payment ${tx_ref} already processed`);
            console.log(
                `⚠️ Payment ${tx_ref} already processed - skipping duplicate webhook`
            );
            return;
        }

        // Verify amount matches
        const expectedAmount = paymentHistory.flutterwaveAmount;
        if (amount !== expectedAmount) {
            logger.error(
                `Amount mismatch for ${tx_ref}. Expected: ${expectedAmount}, Received: ${amount}`
            );
            console.error(`❌ Amount mismatch for ${tx_ref}:`);
            console.error(
                `   Expected: ${expectedAmount} kobo (₦${paymentHistory.flutterwaveAmount})`
            );
            console.error(`   Received: ${amount} kobo (₦${amount / 100})`);
            console.error(
                `   Difference: ${Math.abs(amount - expectedAmount)} kobo`
            );
            return;
        }

        // Process wallet deduction if applicable
        if (paymentHistory.walletUsed > 0) {
            try {
                console.log(
                    `💳 Processing wallet deduction for user ${paymentHistory.userId}: ₦${paymentHistory.walletUsed}`
                );

                const walletResult = await processWalletDebit(
                    paymentHistory.userId,
                    paymentHistory.walletUsed,
                    'ORDER',
                    `Wallet payment for order ${tx_ref}`,
                    {
                        paymentHistoryId: paymentHistory._id,
                        isWebhookProcessed: true,
                        flutterwaveReference: tx_ref,
                    }
                );

                // Invalidate wallet cache
                await invalidateWalletCache(paymentHistory.userId);

                console.log(
                    `✅ Wallet deduction successful: ₦${paymentHistory.walletUsed} deducted from user ${paymentHistory.userId}`
                );
            } catch (error) {
                console.error(
                    `❌ Wallet deduction failed for user ${paymentHistory.userId}:`,
                    error
                );
                logger.error(
                    `Wallet deduction failed for user ${paymentHistory.userId}:`,
                    error
                );
                // Don't fail the entire webhook if wallet deduction fails
                // The payment can still be processed without wallet deduction
            }
        }

        // Mark payment as paid
        paymentHistory.status = 'paid';
        paymentHistory.flutterwaveData = data;
        await paymentHistory.save();

        // Process group buys
        console.log(
            `🔄 Starting group buy processing for payment: ${paymentHistory._id}`
        );
        console.log(
            `🔄 Payment cart items:`,
            JSON.stringify(paymentHistory.cartItems, null, 2)
        );
        let groupBuys = [];
        try {
            groupBuys = await processGroupBuys(paymentHistory);
            console.log(
                `✅ Group buys processed successfully: ${groupBuys.length} created/joined`
            );
            console.log(
                `✅ Group buy details:`,
                groupBuys.map((gb) => ({
                    id: gb._id,
                    productId: gb.productId,
                    status: gb.status,
                    unitsSold: gb.unitsSold,
                    participants: gb.participants?.length || 0,
                }))
            );
        } catch (error) {
            console.error(`❌ Error processing group buys:`, error);
            console.error(`❌ Error stack:`, error.stack);
            logger.error(
                `Group buy processing failed for payment ${paymentHistory._id}:`,
                error
            );
            // Continue with order creation even if group buys fail
        }

        // Create Order AFTER payment confirmation and GroupBuy processing
        const order = await createOrderFromPayment(paymentHistory);

        // Link order to group buys
        await linkOrderToGroupBuys(order, groupBuys);

        try {
            await Cart.findOneAndUpdate(
                { user: paymentHistory.userId },
                { items: [] }
            );
            console.log(
                `✅ Cart cleared for user ${paymentHistory.userId} after successful payment`
            );
        } catch (error) {
            console.error(
                `❌ Error clearing cart for user ${paymentHistory.userId}:`,
                error
            );
            logger.error(
                `Cart clearing failed for user ${paymentHistory.userId}:`,
                error
            );
            // Don't fail the entire webhook if cart clearing fails
        }

        try {
            // Send payment success notification
            await notificationService.notifyPaymentSuccess(
                paymentHistory.userId,
                paymentHistory.amount,
                paymentHistory.walletUsed > 0
                    ? 'wallet + flutterwave'
                    : 'flutterwave',
                order._id
            );

            // Send order creation notification
            await notificationService.notifyOrderCreated(
                paymentHistory.userId,
                {
                    orderId: order._id,
                    trackingNumber: order.trackingNumber,
                    totalAmount: paymentHistory.amount,
                    groupBuysJoined: groupBuys.length,
                }
            );

            // Send group buy notifications for each group buy joined/created
            for (const groupBuy of groupBuys) {
                const Product = (await import('../models/Product.js')).default;
                const product = await Product.findById(groupBuy.productId);
                if (product) {
                    if (groupBuy.status === 'successful') {
                        await notificationService.notifyGroupBuySecured(
                            paymentHistory.userId,
                            product.name,
                            groupBuy._id
                        );
                    }
                }
            }

            console.log(`✅ Notifications sent for payment ${tx_ref}`);
        } catch (notificationError) {
            console.error(
                `❌ Error sending notifications for payment ${tx_ref}:`,
                notificationError
            );
            logger.error(
                `Notification sending failed for payment ${paymentHistory._id}:`,
                notificationError
            );
            // Don't fail the entire webhook if notifications fail
        }

        logger.info(
            `Payment ${tx_ref} processed successfully. Group buys created: ${groupBuys.length}`
        );

        console.log(`✅ Webhook processed successfully`);

        // Emit WebSocket event
        const io = global.io;
        if (io) {
            io.to(`user_${paymentHistory.userId}`).emit('paymentSuccess', {
                tx_ref,
                amount: paymentHistory.amount,
                groupBuysJoined: groupBuys.length,
            });

            // Emit social proof notification to all users
            try {
                const User = (await import('../models/User.js')).default;
                const user = await User.findById(paymentHistory.userId).select(
                    'name email'
                );

                if (user && groupBuys.length > 0) {
                    // Get the first product from group buys for social proof
                    const Product = (await import('../models/Product.js'))
                        .default;
                    const product = await Product.findById(
                        groupBuys[0].productId
                    ).select('title');

                    if (product) {
                        // Anonymize user name (show only first name)
                        const displayName = user.name || 'Someone';
                        const productName = product.title || 'a product';

                        io.emit('purchase:social_proof', {
                            userName: displayName,
                            productName: productName,
                            timestamp: new Date(),
                            purchaseId: paymentHistory._id,
                        });
                    }
                }
            } catch (socialProofError) {
                console.error(
                    `❌ Error emitting social proof:`,
                    socialProofError
                );
                // Don't fail the webhook if social proof fails
            }
        }
    } catch (error) {
        logger.error(
            `❌ Webhook processing failed for ${data.reference}:`,
            error
        );
        throw error;
    }
};

const handleFailedCharge = async (data) => {
    try {
        const { reference } = data;

        const paymentHistory = await PaymentHistory.findOne({
            flutterwaveReference: reference,
        });
        if (!paymentHistory) {
            logger.error(
                `Payment history not found for failed charge: ${reference}`
            );
            return;
        }

        paymentHistory.status = 'failed';
        paymentHistory.flutterwaveData = data;
        await paymentHistory.save();

        logger.info(`Payment ${reference} marked as failed`);

        // Emit WebSocket event
        const io = global.io;
        if (io) {
            io.to(`user_${paymentHistory.userId}`).emit('paymentFailed', {
                reference,
                message: 'Payment failed. Please try again.',
            });
        }
    } catch (error) {
        logger.error('Error handling failed charge:', error);
    }
};
