import Cart from "../models/cart.js"
import Product from "../models/Product.js"
import Wallet from "../models/Wallet.js"
import GroupBuy from "../models/GroupBuy.js"
import { calculateBaseUnitQuantity, calculateOriginalUnitPrice } from "../utils/sellingUnitHelper.js"

const calculateSellingUnitPrice = (product, sellingUnit) => {
  if (!sellingUnit || !product.sellingUnits?.enabled) {
    return product.price
  }

  if (sellingUnit.priceType === "manual" && sellingUnit.customPrice > 0) {
    return sellingUnit.customPrice
  }

  // Use current product price instead of baseUnitPrice to respect discounts
  // For rice example: 1 bag = 12 paints, so 1 paint = ₦50,000 / 12 = ₦4,167
  // Then 1 paint × baseUnitQuantity = final price
  
  // Find the total base units that make up the full product
  // This assumes the product price represents the price for the full product
  const fullProductBaseUnits = product.sellingUnits.options.reduce((total, option) => {
    return Math.max(total, option.baseUnitQuantity)
  }, 0)
  
  // Calculate price per base unit from current product price
  const baseUnitPrice = fullProductBaseUnits > 0 ? product.price / fullProductBaseUnits : product.price
  
  return Math.round(baseUnitPrice * sellingUnit.baseUnitQuantity)
}

const formatCartItems = (cartItems) => {
  return cartItems.map((item) => {
    // Use stored unitPrice if available, otherwise fall back to product price
    let itemPrice = item.unitPrice || item.product.price
    let displayInfo = {
      displayName: `${item.quantity} ${item.product.unitTag}`,
      baseUnitDisplay: null,
    }

    if (item.sellingUnit && item.product.sellingUnits?.enabled) {
      // For selling units, use the stored pricePerUnit from sellingUnit
      itemPrice = item.sellingUnit.pricePerUnit || item.unitPrice || item.product.price
      displayInfo = {
        displayName: `${item.quantity} ${item.sellingUnit.displayName}`,
        baseUnitDisplay: `${item.sellingUnit.totalBaseUnits} ${item.sellingUnit.baseUnitName}${item.sellingUnit.totalBaseUnits > 1 ? "s" : ""}`,
      }
    }

    const itemTotal = itemPrice * item.quantity

    return {
      ...item.toObject(),
      itemPrice,
      itemTotal,
      ...displayInfo,
    }
  })
}

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id

    let cart = await Cart.findOne({ user: userId }).populate("items.product")
    
    // Clean up any cart items with null products
    if (cart) {
      cart = await cleanupCartItems(cart)
      // Re-populate after cleanup
      cart = await Cart.findOne({ user: userId }).populate("items.product")
    }

    if (!cart) {
      return res.json({
        items: [],
        totalPrice: 0,
        itemCount: 0,
        walletBalance: 0,
        cartId: null,
      })
    }

    let totalPrice = 0
    const validItems = []

    for (const item of cart.items) {
      if (item.product) {
        // Use stored unitPrice if available, otherwise fall back to product price
        let itemPrice = item.unitPrice || item.product.price

        if (item.sellingUnit && item.product.sellingUnits?.enabled) {
          // For selling units, use the stored pricePerUnit from sellingUnit
          itemPrice = item.sellingUnit.pricePerUnit || item.unitPrice || item.product.price
        }

        const itemTotal = itemPrice * item.quantity
        totalPrice += itemTotal
        validItems.push(item)
      }
    }

    const formattedItems = formatCartItems(validItems)

    // Get user's wallet balance for offset calculation
    const wallet = await Wallet.findOne({ user: userId })
    const walletBalance = wallet?.balance || 0

    // Calculate potential wallet offset
    const maxWalletUse = Math.min(walletBalance, totalPrice)
    const remainingAfterWallet = totalPrice - maxWalletUse

    res.json({
      items: formattedItems,
      totalPrice,
      itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
      walletBalance,
      maxWalletUse,
      remainingAfterWallet,
      cartId: cart._id,
    })
  } catch (error) {
    console.error("Get cart error:", error)
    res.status(500).json({ message: "Error fetching cart", error: error.message })
  }
}

// Helper function to clean up cart items with null products
const cleanupCartItems = async (cart) => {
  const originalLength = cart.items.length
  cart.items = cart.items.filter(item => item.product != null)
  const removedCount = originalLength - cart.items.length
  
  if (removedCount > 0) {
    console.log(`Cleaned up ${removedCount} cart items with null products for user: ${cart.user}`)
    await cart.save()
  }
  
  return cart
}

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variant, sellingUnit } = req.body
    const userId = req.user.id

    // Verify product exists and has stock
    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const existingGroupBuy = await GroupBuy.findOne({
      productId: productId,
      status: { $in: ["completed", "expired"] },
    })

    if (existingGroupBuy) {
      const statusMessage =
        existingGroupBuy.status === "completed"
          ? "This product is currently unavailable due to a completed group buy"
          : "This product is currently unavailable due to an expired group buy"

      return res.status(400).json({
        message: statusMessage,
        reason: "groupbuy_restriction",
      })
    }

    let cart = await Cart.findOne({ user: userId })

    if (!cart) {
      cart = new Cart({ user: userId, items: [] })
    }

    let sellingUnitData = null
    let itemUnitPrice = product.price // Default to product price

    if (sellingUnit && product.sellingUnits?.enabled) {
      const unitPrice = calculateSellingUnitPrice(product, sellingUnit)

      const baseUnitQuantity = Number(sellingUnit.baseUnitQuantity) || 0
      const validQuantity = Number(quantity) || 1

      // Store the calculated unit price for this selling unit
      itemUnitPrice = unitPrice

      const originalUnitPrice = calculateOriginalUnitPrice(product, sellingUnit)
      
      sellingUnitData = {
        optionName: sellingUnit.name,
        displayName: sellingUnit.displayName,
        baseUnitQuantity: baseUnitQuantity,
        baseUnitName: product.sellingUnits.baseUnitName,
        pricePerUnit: unitPrice,
        originalPricePerUnit: originalUnitPrice,
        totalBaseUnits: baseUnitQuantity * validQuantity,
        savingsPerUnit: originalUnitPrice - unitPrice,
      }
    }

    const existingItemIndex = cart.items.findIndex((item) => {
      const productMatch = item.product.toString() === productId
      
      // Normalize variant comparison - treat null and undefined as equivalent
      const normalizedRequestVariant = variant || null
      const normalizedItemVariant = item.variant || null
      const variantMatch = normalizedRequestVariant === normalizedItemVariant
      
      // Normalize selling unit comparison - treat null and undefined as equivalent
      const normalizedRequestSellingUnit = sellingUnitData?.optionName || null
      const normalizedItemSellingUnit = item.sellingUnit?.optionName || null
      const sellingUnitMatch = normalizedRequestSellingUnit === normalizedItemSellingUnit
      
      return productMatch && variantMatch && sellingUnitMatch
    })

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity

      if (newQuantity > product.stock) {
        return res.status(400).json({
          message: `Cannot add more. Total would exceed stock of ${product.stock}`,
        })
      }

      cart.items[existingItemIndex].quantity = newQuantity
      cart.items[existingItemIndex].unitPrice = itemUnitPrice
      if (cart.items[existingItemIndex].sellingUnit) {
        const baseUnitQuantity = Number(cart.items[existingItemIndex].sellingUnit.baseUnitQuantity) || 0
        const validNewQuantity = Number(newQuantity) || 0
        cart.items[existingItemIndex].sellingUnit.totalBaseUnits = baseUnitQuantity * validNewQuantity
      }
    } else {
      // Add new item if it doesn't exist
      if (quantity > product.stock) {
        return res.status(400).json({
          message: `Cannot add ${quantity} items. Only ${product.stock} are available.`,
        })
      }

      const newItem = {
        product: productId,
        quantity,
        variant,
        sellingUnit: sellingUnitData,
        unitPrice: itemUnitPrice, // Store the calculated unit price
      }
      cart.items.push(newItem)
    }

    await cart.save()

    // Fetch and return the updated cart data for the frontend
    let updatedCart = await Cart.findOne({ user: userId }).populate("items.product")
    
    // Clean up any cart items with null products
    if (updatedCart) {
      updatedCart = await cleanupCartItems(updatedCart)
      // Re-populate after cleanup
      updatedCart = await Cart.findOne({ user: userId }).populate("items.product")
    }

    let totalPrice = 0
    for (const item of updatedCart.items) {
      // Check if product exists and has valid data
      if (!item.product) {
        console.warn(`Cart item has null product: ${item._id}`)
        continue // Skip this item if product is null
      }
      
      // Use stored unitPrice if available, otherwise fall back to product price
      let itemPrice = item.unitPrice || item.product.price
      if (item.sellingUnit && item.product.sellingUnits?.enabled) {
        // For selling units, use the stored pricePerUnit from sellingUnit
        itemPrice = item.sellingUnit.pricePerUnit || item.unitPrice || item.product.price
      }
      totalPrice += itemPrice * item.quantity
    }

    const formattedItems = formatCartItems(updatedCart.items)

    const wallet = await Wallet.findOne({ user: userId })
    const walletBalance = wallet?.balance || 0
    const maxWalletUse = Math.min(walletBalance, totalPrice)

    // Cart notifications removed - too noisy for users

    res.status(200).json({
      message: "Item added to cart successfully",
      items: formattedItems,
      totalPrice,
      itemCount: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
      walletBalance,
      maxWalletUse,
      remainingAfterWallet: totalPrice - maxWalletUse,
      cartId: updatedCart._id,
    })
  } catch (error) {
    console.error("Add to cart error:", error)
    res.status(500).json({ message: "Error adding to cart", error: error.message })
  }
}

export const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity, variant, sellingUnitName } = req.body
    const userId = req.user.id



    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" })
    }

    const validQuantity = Number(quantity) || 0

    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }


    cart.items.forEach((item, index) => {

    })

    const itemIndex = cart.items.findIndex((item) => {
      const productMatch = item.product.toString() === productId
      
      // Normalize variant comparison - treat null and undefined as equivalent
      const normalizedRequestVariant = variant || null
      const normalizedItemVariant = item.variant || null
      const variantMatch = normalizedRequestVariant === normalizedItemVariant
      
      // Normalize selling unit comparison - treat null and undefined as equivalent
      const normalizedRequestSellingUnit = sellingUnitName || null
      const normalizedItemSellingUnit = item.sellingUnit?.optionName || null
      const sellingUnitMatch = normalizedRequestSellingUnit === normalizedItemSellingUnit



      return productMatch && variantMatch && sellingUnitMatch
    })

    if (itemIndex === -1) {

      return res.status(404).json({
        message: "Item not found in cart",
        debug: {
          searchingFor: { productId, variant, sellingUnitName },
          availableItems: cart.items.map((item) => ({
            productId: item.product.toString(),
            variant: item.variant,
            sellingUnitName: item.sellingUnit?.optionName,
          })),
        },
      })
    }



    // If quantity is 0 or less, remove item
    if (validQuantity <= 0) {
      cart.items.splice(itemIndex, 1)
    } else {
      // Verify stock availability
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(404).json({ message: "Product not found" })
      }

      if (validQuantity > product.stock) {
        return res.status(400).json({
          message: `Insufficient stock. Available: ${product.stock}`,
        })
      }

      cart.items[itemIndex].quantity = validQuantity

      if (cart.items[itemIndex].sellingUnit && product.sellingUnits?.enabled) {
        // Recalculate selling unit price
        const sellingUnitPrice = calculateSellingUnitPrice(product, cart.items[itemIndex].sellingUnit)
        cart.items[itemIndex].unitPrice = sellingUnitPrice
        cart.items[itemIndex].sellingUnit.pricePerUnit = sellingUnitPrice

        // Update total base units
        const baseUnitQuantity = Number(cart.items[itemIndex].sellingUnit.baseUnitQuantity) || 0
        cart.items[itemIndex].sellingUnit.totalBaseUnits = baseUnitQuantity * validQuantity
      } else {
        // For non-selling unit products, use base product price
        cart.items[itemIndex].unitPrice = product.price
      }
    }

    await cart.save()

    // Return updated cart with pricing
    const updatedCart = await Cart.findOne({ user: userId }).populate("items.product")

    let totalPrice = 0
    for (const item of updatedCart.items) {
      // Check if product exists and has valid data
      if (!item.product) {
        console.warn(`Cart item has null product: ${item._id}`)
        continue // Skip this item if product is null
      }
      
      // Use stored unitPrice if available, otherwise fall back to product price
      let itemPrice = item.unitPrice || item.product.price
      if (item.sellingUnit && item.product.sellingUnits?.enabled) {
        // For selling units, use the stored pricePerUnit from sellingUnit
        itemPrice = item.sellingUnit.pricePerUnit || item.unitPrice || item.product.price
      }
      totalPrice += itemPrice * item.quantity
    }

    const formattedItems = formatCartItems(updatedCart.items)

    // Get wallet balance for offset calculation
    const wallet = await Wallet.findOne({ user: userId })
    const walletBalance = wallet?.balance || 0
    const maxWalletUse = Math.min(walletBalance, totalPrice)

    res.json({
      message: "Cart updated successfully",
      items: formattedItems,
      totalPrice,
      itemCount: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
      walletBalance,
      maxWalletUse,
      remainingAfterWallet: totalPrice - maxWalletUse,
      cartId: updatedCart._id,
    })
  } catch (error) {
    console.error("Update quantity error:", error)
    res.status(500).json({ message: "Error updating cart", error: error.message })
  }
}

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params
    const { variant, sellingUnitName } = req.query
    const userId = req.user.id

    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Filter out the specific item based on productId, variant, and sellingUnit
    cart.items = cart.items.filter((item) => {
      const productMatch = item.product.toString() === productId
      const variantMatch = (item.variant || null) === (variant || null)
      const sellingUnitMatch = (item.sellingUnit?.optionName || null) === (sellingUnitName || null)
      
      // Remove item only if ALL criteria match
      return !(productMatch && variantMatch && sellingUnitMatch)
    })

    await cart.save()

    // Cart removal notifications removed - too noisy for users

    // Return updated cart data
    const updatedCart = await Cart.findOne({ user: userId }).populate("items.product")
    
    let totalPrice = 0
    for (const item of updatedCart.items) {
      // Check if product exists and has valid data
      if (!item.product) {
        console.warn(`Cart item has null product: ${item._id}`)
        continue // Skip this item if product is null
      }
      
      let itemPrice = item.unitPrice || item.product.price
      if (item.sellingUnit && item.product.sellingUnits?.enabled) {
        itemPrice = item.sellingUnit.pricePerUnit || item.unitPrice || item.product.price
      }
      totalPrice += itemPrice * item.quantity
    }

    const formattedItems = formatCartItems(updatedCart.items)

    // Get wallet balance
    const wallet = await Wallet.findOne({ user: userId })
    const walletBalance = wallet?.balance || 0
    const maxWalletUse = Math.min(walletBalance, totalPrice)

    res.json({
      message: "Item removed from cart",
      items: formattedItems,
      totalPrice,
      itemCount: formattedItems.reduce((sum, item) => sum + item.quantity, 0),
      walletBalance,
      maxWalletUse,
      remainingAfterWallet: totalPrice - maxWalletUse,
      cartId: updatedCart._id,
    })
  } catch (error) {
    console.error("Remove from cart error:", error)
    res.status(500).json({ message: "Error removing from cart", error: error.message })
  }
}

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id

    await Cart.findOneAndUpdate({ user: userId }, { items: [] }, { upsert: true })

    // Return updated cart data after clearing
    const updatedCart = await Cart.findOne({ user: userId }).populate("items.product")
    
    const wallet = await Wallet.findOne({ user: userId })
    const walletBalance = wallet?.balance || 0

    res.json({ 
      message: "Cart cleared successfully",
      items: [],
      totalPrice: 0,
      itemCount: 0,
      walletBalance,
      maxWalletUse: 0,
      remainingAfterWallet: 0,
      cartId: updatedCart._id,
    })
  } catch (error) {
    console.error("Clear cart error:", error)
    res.status(500).json({ message: "Error clearing cart", error: error.message })
  }
}
