import Cart from '../models/cart.js';
import Product from '../models/Product.js';

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart) {
      return res.json({ items: [], totalPrice: 0 });
    }

    // Calculate live total price
    let totalPrice = 0;
    const validItems = [];

    for (const item of cart.items) {
      if (item.product && item.product.stock >= item.quantity) {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        validItems.push({
          ...item.toObject(),
          itemTotal
        });
      }
    }

    res.json({ 
      items: validItems, 
      totalPrice,
      itemCount: validItems.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
};

export const addToCart = async (req, res) => {
  const { productId, quantity, variant } = req.body;

  try {
    // Verify product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const existing = cart.items.find(item => 
      item.product.toString() === productId && item.variant === variant
    );

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ message: 'Insufficient stock for requested quantity' });
      }
      existing.quantity = newQuantity;
    } else {
      cart.items.push({ product: productId, quantity, variant });
    }

    await cart.save();
    
    // Return updated cart with populated products
    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    // Calculate total price
    let totalPrice = 0;
    const cartItems = updatedCart.items.map(item => {
      const itemTotal = item.product.price * item.quantity;
      totalPrice += itemTotal;
      return { ...item.toObject(), itemTotal };
    });

    res.status(200).json({ 
      items: cartItems, 
      totalPrice,
      itemCount: cartItems.length,
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to cart', error: error.message });
  }
};

export const updateCartQuantity = async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    // If quantity is 0 or less, remove the item
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      // Verify product stock
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ 
          message: 'Insufficient stock available',
          availableStock: product.stock
        });
      }

      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    // Return updated cart with populated products and totals
    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    let totalPrice = 0;
    const cartItems = updatedCart ? updatedCart.items.map(item => {
      const itemTotal = item.product.price * item.quantity;
      totalPrice += itemTotal;
      return { ...item.toObject(), itemTotal };
    }) : [];

    res.json({ 
      items: cartItems, 
      totalPrice,
      itemCount: cartItems.length,
      message: quantity <= 0 ? 'Item removed from cart' : 'Cart updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating cart', error: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  const { itemId } = req.params;
  
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(i => i._id.toString() !== itemId);
    await cart.save();

    // Return updated cart with totals
    const updatedCart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    let totalPrice = 0;
    const cartItems = updatedCart ? updatedCart.items.map(item => {
      const itemTotal = item.product.price * item.quantity;
      totalPrice += itemTotal;
      return { ...item.toObject(), itemTotal };
    }) : [];

    res.json({ 
      items: cartItems, 
      totalPrice,
      itemCount: cartItems.length,
      message: 'Item removed from cart'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from cart', error: error.message });
  }
};
