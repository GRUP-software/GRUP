import express from "express"
import { verifyToken } from "../middleware/authMiddleware.js"
import { checkout } from "../controllers/checkoutController.js"

const router = express.Router()

router.post("/", verifyToken, checkout)

export default router
