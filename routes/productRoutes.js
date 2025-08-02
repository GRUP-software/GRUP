import express from 'express';
import upload from '../middleware/upload.js'; // for image uploads
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

import { getProductBySlug } from '../controllers/productController.js';

import Product from '../models/Product.js';

const router = express.Router();

// Public route to get all products
router.get('/', getAllProducts);

router.get('/slug/:slug', getProductBySlug);

// Protected: Admin creates product with image upload
router.post('/', verifyToken, upload.array('images', 5), createProduct);

// Protected: Admin updates product
router.put('/:id', verifyToken, upload.array('images', 5), updateProduct);

// Protected: Admin deletes product
router.delete('/:id', verifyToken, deleteProduct);

export default router;
