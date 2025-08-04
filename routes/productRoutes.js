import express from "express"
import upload from "../middleware/upload.js" // for image uploads
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductBySlug,
  getProductById,
} from "../controllers/productController.js"

const router = express.Router()

// Public routes to get products with descriptions
router.get("/", getAllProducts)
router.get("/slug/:slug", getProductBySlug)
router.get("/id/:id", getProductById)

// Protected: Admin creates product with image upload
router.post("/", verifyToken, upload.array("images", 5), createProduct)

// Protected: Admin updates product
router.put("/:id", verifyToken, upload.array("images", 5), updateProduct)

// Protected: Admin deletes product
router.delete("/:id", verifyToken, deleteProduct)

export default router
