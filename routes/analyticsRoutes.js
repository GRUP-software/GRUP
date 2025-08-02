import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import { getAnalytics, getProductInsights } from "../controllers/analyticsController.js"
import { getRecommendations, getInventoryAlerts } from "../controllers/recommendationController.js"

const router = express.Router()

// Analytics endpoints
router.get("/dashboard", verifyToken, getAnalytics)
router.get("/products", verifyToken, getProductInsights)
router.get("/recommendations", verifyToken, getRecommendations)
router.get("/inventory-alerts", verifyToken, getInventoryAlerts)

export default router
