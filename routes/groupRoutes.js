import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  createGroup,
  joinGroup,
  getGroupStatus,
  getGroupProgress,
  getProductGroupProgress,
  getUserGroups,
  getAllGroups,
  secureGroup,
  cancelGroup,
} from "../controllers/groupController.js"

const router = express.Router()

// Public routes
router.get("/progress", getGroupProgress)
router.get("/product-progress/:productId", getProductGroupProgress)
router.get("/status/:productId", getGroupStatus)

// Protected routes (require authentication)
router.post("/create", verifyToken, createGroup)
router.post("/group-start", verifyToken, createGroup) // Backward compatibility
router.post("/join/:groupId", verifyToken, joinGroup)
router.get("/my-groups", verifyToken, getUserGroups)

// Admin routes (require authentication)
router.get("/all", verifyToken, getAllGroups)
router.put("/secure/:groupId", verifyToken, secureGroup)
router.put("/cancel/:groupId", verifyToken, cancelGroup)

export default router
