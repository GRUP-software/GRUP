import Cart from '../models/cart.js';
import Product from '../models/Product.js';
import Wallet from '../models/Wallet.js';

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart) {
      return res.json({
        items: [],
        totalPrice: 0,
        itemCount: 0,
        walletBalance: 0,
        cartId: null, // Explicitly return null if no cart
      });
    }

    // Calculate total price with current product prices
    let totalPrice = 0;
    const validItems = [];

    for (const item of cart.items) {
      if (item.product && item.product.price) {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        validItems.push({
          ...item.toObject(),
          itemTotal,
        });
      }
    }

    // Get user's wallet balance for offset calculation
    const wallet = await Wallet.findOne({ user: userId });
    const walletBalance = wallet?.balance || 0;

    // Calculate potential wallet offset
    const maxWalletUse = Math.min(walletBalance, totalPrice);
    const remainingAfterWallet = totalPrice - maxWalletUse;

    res.json({
      items: validItems,
      totalPrice,
      itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
      walletBalance,
      maxWalletUse,
      remainingAfterWallet,
      cartId: cart._id, // Include cartId here
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;

    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({ 
          message: `Cannot add more. Total would exceed stock of ${product.stock}` 
        });
      }

      // Update the quantity of the existing item
      cart.items[existingItemIndex].quantity = newQuantity;

    } else {
      // Add new item if it doesn't exist
      if (quantity > product.stock) {
        return res.status(400).json({ 
          message: `Cannot add ${quantity} items. Only ${product.stock} are available.`
        });
      }
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    
    // Fetch and return the updated cart data for the frontend
    const updatedCart = await Cart.findOne({ user: userId }).populate('items.product');

    // Calculate total price and other details for a complete response
    let totalPrice = 0;
    const cartItems = updatedCart.items.map(item => {
      const itemTotal = item.product.price * item.quantity;
      totalPrice += itemTotal;
      return {
        ...item.toObject(),
        itemTotal,
      };
    });

    const wallet = await Wallet.findOne({ user: userId });
    const walletBalance = wallet?.balance || 0;
    const maxWalletUse = Math.min(walletBalance, totalPrice);

    res.status(200).json({
      message: 'Item added to cart successfully',
      items: cartItems,
      totalPrice,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      walletBalance,
      maxWalletUse,
      remainingAfterWallet: totalPrice - maxWalletUse,
      cartId: updatedCart._id, // Include cartId here
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Error adding to cart', error: error.message });
  }
};

export const updateCartQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // If quantity is 0 or less, remove item
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      // Verify stock availability
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (quantity > product.stock) {
        return res.status(400).json({ 
          message: `Insufficient stock. Available: ${product.stock}` 
        });
      }

      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    // Return updated cart with pricing
    const updatedCart = await Cart.findOne({ user: userId }).populate('items.product');
    
    let totalPrice = 0;
    const cartItems = updatedCart.items.map(item => {
      const itemTotal = item.product.price * item.quantity;
      totalPrice += itemTotal;
      return {
        ...item.toObject(),
        itemTotal,
      };
    });

    // Get wallet balance for offset calculation
    const wallet = await Wallet.findOne({ user: userId });
    const walletBalance = wallet?.balance || 0;
    const maxWalletUse = Math.min(walletBalance, totalPrice);

    res.json({
      message: 'Cart updated successfully',
      items: cartItems,
      totalPrice,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      walletBalance,
      maxWalletUse,
      remainingAfterWallet: totalPrice - maxWalletUse,
      cartId: updatedCart._id, // Include cartId here
    });
  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({ message: 'Error updating cart', error: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Error removing from cart', error: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await Cart.findOneAndUpdate(
      { user: userId },
      { items: [] },
      { upsert: true }
    );

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Error clearing cart', error: error.message });
  }
};
