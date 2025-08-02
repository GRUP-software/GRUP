import express from "express"
import {
  startGroup,
  joinGroup,
  getGroupStatus,
  getAllGroups,
  getMyGroups,
  getGroupProgress,
} from "../controllers/groupController.js"
import { verifyToken } from "../middleware/authMiddleware.js"

const router = express.Router()

router.get("/all", getAllGroups)
router.get("/progress", getGroupProgress) // For product cards
router.get("/my-groups", verifyToken, getMyGroups)
router.post("/group-start", verifyToken, startGroup)
router.post("/group-join/:productId", verifyToken, joinGroup)
router.get("/group-status/:productId", getGroupStatus)

export default router
