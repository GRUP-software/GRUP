import Cart from "../models/cart.js"
import Product from "../models/Product.js"
import Wallet from "../models/Wallet.js"
import PaymentHistory from "../models/PaymentHistory.js"
import { processGroupBuys } from "./paymentController.js"
import { nanoid } from "nanoid"
import config from "../config/environment.js" // Import environment configuration

export const checkout = async (req, res) => {
  try {
    const { 
      walletUse = 0, 
      paymentMethod = 'flutterwave_only',
      deliveryAddress,
      phone,
      callback_url
    } = req.body
    const userId = req.user.id

    // Get user's cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product")
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" })
    }

    // Verify all cart items and calculate total
    let totalPrice = 0
    const cartItems = []

    console.log("🔍 Checkout Debug - Cart items:")
    cart.items.forEach((item, index) => {
      console.log(`   Item ${index + 1}:`, {
        productId: item.product._id,
        quantity: item.quantity,
        sellingUnit: item.sellingUnit,
        unitPrice: item.unitPrice,
        hasSellingUnit: !!item.sellingUnit,
        baseUnitQuantity: item.sellingUnit?.baseUnitQuantity
      })
    })

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product.title} not found` })
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${item.quantity}`,
        })
      }

      // Use stored selling unit price if available, otherwise fall back to product price
      let itemPrice = item.unitPrice || product.price
      if (item.sellingUnit && product.sellingUnits?.enabled) {
        itemPrice = item.sellingUnit.pricePerUnit || item.unitPrice || product.price
      }

      const itemTotal = itemPrice * item.quantity
      totalPrice += itemTotal

      const cartItemData = {
        productId: product._id,
        quantity: item.quantity,
        price: itemPrice, // Store the actual selling unit price at time of purchase
      }

      // Extract selling unit data if it exists
      if (
        item.sellingUnit &&
        item.sellingUnit !== null &&
        item.sellingUnit !== undefined &&
        !(item.sellingUnit.valueOf && item.sellingUnit.valueOf() === null) &&
        item.sellingUnit.toString() !== "null" &&
        item.sellingUnit.toString() !== ""
      ) {
        cartItemData.sellingUnit = {
          optionName: item.sellingUnit.optionName,
          displayName: item.sellingUnit.displayName,
          baseUnitQuantity: item.sellingUnit.baseUnitQuantity,
          baseUnitName: item.sellingUnit.baseUnitName,
          pricePerUnit: item.sellingUnit.pricePerUnit,
          originalPricePerUnit: item.sellingUnit.originalPricePerUnit,
          totalBaseUnits: item.sellingUnit.totalBaseUnits,
          savingsPerUnit: item.sellingUnit.savingsPerUnit,
        }
      }
      
      console.log("🔍 Checkout Debug - Cart item being saved:", cartItemData)
      cartItems.push(cartItemData)
    }

    // Generate unique reference
    const referenceId = `GRP_${nanoid(10)}_${Date.now()}`

    // Create temporary payment history
    const paymentHistory = new PaymentHistory({
      userId,
      referenceId,
      cartItems,
      amount: totalPrice,
      walletUsed: 0,
              flutterwaveAmount: totalPrice,
      status: "pending",
      metadata: {
        deliveryAddress: deliveryAddress || {},
        phone: phone,
        paymentMethod: paymentMethod,
      },
    })

    await paymentHistory.save()

    // Route to appropriate payment processor based on method
    if (paymentMethod === 'wallet_only') {
      // Process wallet-only payment immediately
      return await processWalletOnlyPayment(paymentHistory, walletUse, res)
    } else if (paymentMethod === 'wallet_and_flutterwave') {
      // Process partial wallet + Flutterwave
      return await processPartialWalletPayment(paymentHistory, walletUse, callback_url, res)
    } else {
      // Default: Flutterwave-only payment
      return await processFlutterwaveOnlyPayment(paymentHistory, callback_url, res)
    }
  } catch (error) {
    console.error("Checkout error:", error)
    res.status(500).json({ message: "Checkout failed", error: error.message })
  }
}

// Helper function to process wallet-only payments
const processWalletOnlyPayment = async (paymentHistory, walletUse, res) => {
  try {


    // Validate wallet balance
    const wallet = await Wallet.findOne({ user: paymentHistory.userId })
    if (!wallet) {
      console.error(`❌ Wallet not found for user: ${paymentHistory.userId}`)
      return res.status(400).json({ message: "Wallet not found for user." })
    }



    // Validate wallet use amount
    if (walletUse <= 0 || walletUse > paymentHistory.amount) {
      return res.status(400).json({ message: "Invalid wallet use amount" })
    }

    // Check if wallet balance is sufficient
    if (wallet.balance < walletUse) {

      return res.status(400).json({ message: "Insufficient wallet balance" })
    }

    // Update payment history with wallet usage
    paymentHistory.walletUsed = walletUse
    paymentHistory.flutterwaveAmount = 0
    await paymentHistory.save()

    // Deduct the amount from wallet
    const newWalletBalance = wallet.balance - walletUse
    wallet.balance = newWalletBalance
    await wallet.save()


    // Create wallet transaction record
    await Transaction.create({
      wallet: wallet._id,
      type: "debit",
      amount: walletUse,
      reason: "ORDER",
      description: `Wallet used for payment ${paymentHistory.referenceId}`,
      user: paymentHistory.userId,
    })

    // Mark payment as paid
    paymentHistory.status = "paid"
    await paymentHistory.save()


    // Process group buys

    const groupBuys = await processGroupBuys(paymentHistory)


    // Clear user's cart
    await Cart.findOneAndUpdate({ user: paymentHistory.userId }, { items: [] })


    res.json({
      success: true,
      message: "Payment completed successfully using wallet",
      paymentId: paymentHistory._id,
      groupBuysJoined: groupBuys.length,
      walletUsed: walletUse,
      totalAmount: paymentHistory.amount,
      newWalletBalance: newWalletBalance,
      groupBuys: groupBuys.map(gb => ({
        id: gb._id,
        productId: gb.productId,
        status: gb.status,
        unitsSold: gb.unitsSold,
        minimumViableUnits: gb.minimumViableUnits
      }))
    })
  } catch (error) {
    console.error("❌ Wallet-only payment processing error:", error)
    res.status(500).json({ message: "Payment processing failed", error: error.message })
  }
}

    // Process partial wallet + Flutterwave payment
const processPartialWalletPayment = async (paymentHistory, walletUse, callback_url, res) => {
  try {


    // Validate wallet balance (but don't deduct yet!)
    const wallet = await Wallet.findOne({ user: paymentHistory.userId })
    if (!wallet) {
      return res.status(400).json({ message: "Wallet not found for user." })
    }

    // Validate wallet use amount
    if (walletUse <= 0 || walletUse > paymentHistory.amount) {
      return res.status(400).json({ message: "Invalid wallet use amount for partial payment" })
    }

    // Check if wallet balance is sufficient (validation only)
    if (wallet.balance < walletUse) {
      return res.status(400).json({ message: "Insufficient wallet balance" })
    }

    // Calculate remaining amount for Flutterwave
    const flutterwaveAmount = paymentHistory.amount - walletUse

    // Update payment history with wallet usage info (but don't deduct yet!)
    paymentHistory.walletUsed = walletUse
    paymentHistory.flutterwaveAmount = flutterwaveAmount
    paymentHistory.status = "pending" // Keep as pending until Flutterwave succeeds
    await paymentHistory.save()



    // Initialize Flutterwave payment for remaining amount
    const flutterwaveData = {
      email: req.user.email || "customer@grup.com",
      amount: Math.round(flutterwaveAmount * 100), // Convert to kobo
      reference: paymentHistory.referenceId,
      callback_url: callback_url || `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        userId: paymentHistory.userId,
        paymentHistoryId: paymentHistory._id.toString(),
        walletUsed: walletUse,
        totalAmount: paymentHistory.amount,
        cartId: paymentHistory.cartId,
        custom_fields: [
          {
            display_name: "Payment ID",
            variable_name: "payment_id",
            value: paymentHistory._id.toString(),
          },
          {
            display_name: "Wallet Use",
            variable_name: "wallet_use",
            value: walletUse.toString(),
          },
        ],
      },
    }

    // Check if Flutterwave secret key is configured
    if (!config.flutterwave.secretKey) {
      console.error("❌ FLUTTERWAVE_SECRET_KEY is not configured")
      return res.status(500).json({
        success: false,
        message: "Payment service configuration error",
        details: "Payment gateway is not properly configured. Please contact support.",
        error: "FLUTTERWAVE_SECRET_KEY not found"
      })
    }

    const response = await fetch("https://api.flutterwave.com/v3/charges?type=card", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.flutterwave.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flutterwaveData),
    })

    if (!response.ok) {
      console.error(`❌ Flutterwave API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`❌ Flutterwave error details: ${errorText}`)
      
      return res.status(500).json({
        success: false,
        message: "Payment service temporarily unavailable",
        details: "Unable to connect to payment gateway. Please try again later.",
        error: `Flutterwave API error: ${response.status}`,
        suggestions: [
          "Check your internet connection",
          "Try again in a few minutes",
          "Contact support if the issue persists"
        ]
      })
    }

    const data = await response.json()

    if (data.status) {
      // Update payment history with Flutterwave reference
      paymentHistory.flutterwaveReference = data.data.reference
      await paymentHistory.save()



      res.json({
        success: true,
        message: "Partial wallet payment initialized, redirecting to Flutterwave",
        authorization_url: data.data.authorization_url,
        reference: paymentHistory.referenceId,
        paymentHistoryId: paymentHistory._id,
        walletUse: walletUse,
        flutterwaveAmount: flutterwaveAmount,
        totalAmount: paymentHistory.amount,
        currentWalletBalance: wallet.balance, // Show current balance (not deducted yet)
        message: "Wallet balance will be deducted after Flutterwave payment succeeds"
      })
    } else {
      // No wallet deduction needed since we didn't deduct anything

      
      res.status(400).json({
        success: false,
        message: "Failed to initialize Flutterwave payment",
        error: data.message,
        walletDeduction: "none" // Clarify no wallet was deducted
      })
    }
  } catch (error) {
    console.error("❌ Partial wallet payment processing error:", error)
    res.status(500).json({ message: "Payment processing failed", error: error.message })
  }
}

// Process Flutterwave-only payment
const processFlutterwaveOnlyPayment = async (paymentHistory, callback_url, res) => {
  try {


    // Initialize Flutterwave payment
    const flutterwaveData = {
      email: req.user.email || "customer@grup.com",
      amount: Math.round(paymentHistory.amount * 100), // Convert to kobo
      reference: paymentHistory.referenceId,
      callback_url: callback_url || `${process.env.FRONTEND_URL}/payment/callback`,
      metadata: {
        userId: paymentHistory.userId,
        paymentHistoryId: paymentHistory._id.toString(),
        walletUsed: 0,
        custom_fields: [
          {
            display_name: "Payment ID",
            variable_name: "payment_id",
            value: paymentHistory._id.toString(),
          },
        ],
      },
    }

    const response = await fetch("https://api.flutterwave.com/v3/charges?type=card", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.flutterwave.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flutterwaveData),
    })

    const data = await response.json()

    if (data.status) {
      // Update payment history with Flutterwave reference
      paymentHistory.flutterwaveReference = data.data.reference
      await paymentHistory.save()

      res.json({
        success: true,
        authorization_url: data.data.authorization_url,
        reference: paymentHistory.referenceId,
        paymentHistoryId: paymentHistory._id,
        amount: paymentHistory.amount,
        walletUsed: 0,
        totalAmount: paymentHistory.amount,
        message: "Payment initialized successfully"
      })
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to initialize payment",
        error: data.message,
      })
    }
  } catch (error) {
    console.error("❌ Flutterwave-only payment processing error:", error)
    res.status(500).json({ message: "Payment processing failed", error: error.message })
  }
}
