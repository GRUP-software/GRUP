import Cart from '../models/cart.js';
import Product from '../models/Product.js';

export const getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  res.json(cart || { items: [] });
};

export const addToCart = async (req, res) => {
  const { productId, quantity, variant } = req.body;

  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = new Cart({ user: req.user.id, items: [] });
  }

  const existing = cart.items.find(item => item.product.toString() === productId && item.variant === variant);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity, variant });
  }

  await cart.save();
  res.status(200).json(cart);
};

export const removeFromCart = async (req, res) => {
  const { itemId } = req.params;
  const cart = await Cart.findOne({ user: req.user.id });
  cart.items = cart.items.filter(i => i._id.toString() !== itemId);
  await cart.save();
  res.json(cart);
};
