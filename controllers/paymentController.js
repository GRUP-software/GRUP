import Order from "../models/order.js";
import Cart from "../models/cart.js";
import Product from "../models/Product.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import GroupBuy from "../models/GroupBuy.js";
import { calculateDeliveryFee } from "../utils/deliveryCalculator.js";
import { generateTrackingNumber } from "../utils/trackingGenerator.js";
import crypto from "crypto";


export const initializePayment = async (req, res) => {
  try {
    const { deliveryAddress, phone, useWallet, walletAmount, cartId } = req.body;
    const userId = req.user.id;

    if (!deliveryAddress || !phone) {
      return res.status(400).json({ message: "Delivery address and phone number are required" });
    }

    const cart = await Cart.findById(cartId).populate("items.product");
    if (!cart || cart.user.toString() !== userId) {
      return res.status(404).json({ message: "Cart not found or does not belong to user" });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cannot checkout with an empty cart" });
    }

    let subtotal = 0;
    const processedItems = [];

    for (const item of cart.items) {
      const product = item.product;
      const quantity = item.quantity;

      if (!product) {
        return res.status(400).json({ message: "Invalid product in cart" });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.title}` });
      }

      const groupbuy = await GroupBuy.findOne({
        productId: item.product._id,
        "participants.user": userId,
        status: { $in: ["forming", "secured"] },
      });

      const itemTotal = product.basePrice * quantity;
      subtotal += itemTotal;

      processedItems.push({
        product: product._id,
        quantity: quantity,
        variant: item.variant || null,
        price: product.basePrice,
        groupbuyId: groupbuy ? groupbuy._id : null,
        groupStatus: groupbuy ? groupbuy.status : 'N/A',
      });
    }

    const deliveryFee = await calculateDeliveryFee(deliveryAddress.coordinates);
    const totalAmount = subtotal + deliveryFee;

    const wallet = await Wallet.findOne({ user: userId });
    let walletUsed = 0;
    let amountToPay = totalAmount;

    if (useWallet && wallet && wallet.balance > 0) {
      walletUsed = Math.min(wallet.balance, totalAmount, walletAmount);
      amountToPay = totalAmount - walletUsed;
    }

    const order = new Order({
      user: userId,
      items: processedItems,
      subtotal,
      deliveryFee,
      totalAmount,
      walletUsed,
      amountToPay,
      deliveryAddress: {
        ...deliveryAddress,
        phone,
      },
      currentStatus: "payment_pending",
      progress: [{
        status: "payment_pending",
        message: "Order created. Awaiting payment.",
        timestamp: new Date(),
      }],
      paymentStatus: "pending",
      trackingNumber: generateTrackingNumber(),
    });
    
    await order.save();

    const paystackData = {
      email: req.user.email || "customer@grup.com",
      amount: Math.round(order.amountToPay * 100),
      reference: `grup_${order._id}_${Date.now()}`,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
    };

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackData),
    });

    const data = await response.json();

    if (data.status) {
      order.paymentReference = data.data.reference;
      await order.save();
      await Cart.findByIdAndDelete(cartId);

      res.status(200).json({
        success: true,
        paymentUrl: data.data.authorization_url,
        reference: data.data.reference,
        orderId: order._id,
        message: "Payment initialized successfully. Cart has been cleared.",
      });
    } else {
      await Order.findByIdAndDelete(order._id);
      res.status(400).json({
        success: false,
        message: "Failed to initialize payment",
        error: data.message,
      });
    }
  } catch (error) {
    console.error("Payment initialization error:", error);
    res.status(500).json({ message: "Error initializing payment", error: error.message });
  }
};


export const handlePaystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const orderId = metadata.orderId;

      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        order.paymentReference = reference;
        order.currentStatus = "processing";
        order.progress.push({
          status: "payment_confirmed",
          message: "Payment confirmed via webhook",
          timestamp: new Date(),
        });
        await order.save();
        
        const wallet = await Wallet.findOne({ user: order.user });
        if (wallet && order.walletUsed > 0) {
            wallet.balance -= order.walletUsed;
            await wallet.save();

            await Transaction.create({
                wallet: wallet._id,
                type: "debit",
                amount: order.walletUsed,
                reason: "ORDER_PAYMENT",
                description: `Wallet used for order ${order.trackingNumber} payment`,
            });
        }
        
        console.log(`Payment confirmed for order ${orderId} via webhook`);
      }
    }

    res.status(200).json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};
