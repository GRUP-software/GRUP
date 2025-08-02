import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import {
  getShoppingRegions,
  setUserRegion,
  getRegionProducts,
  detectUserRegion,
} from "../controllers/regionController.js"

const router = express.Router()

// Public routes
router.get("/", getShoppingRegions)
router.get("/detect", detectUserRegion)
router.get("/:regionId/products", getRegionProducts)

// Protected routes
router.post("/set", verifyToken, setUserRegion)

export default router
