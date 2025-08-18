import express from "express"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import { verifyToken } from "../middleware/authMiddleware.js"
import { addReferral } from "../utils/referralBonusService.js"

const router = express.Router()
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "7c52c79e0f80ad32abfec954fc7bc171ae9092423ba0d2aee378c1bd23381d6269e7de2493f59549c84b7fcfa2e308dae419c63fee9c2ac15ea021f5be231885"

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" })
}

// SIGNUP ROUTE
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const newUser = new User({ name, email, password })

    // Handle referral logic using the new service
    if (referralCode) {
      const referrer = await User.findOne({ referralCode })
      if (referrer) {
        newUser.referredBy = referrer._id
      }
    }

    await newUser.save()

    // Handle referral logic using the service
    if (referralCode) {
      const referrer = await User.findOne({ referralCode })
      if (referrer) {
        const referralResult = await addReferral(referrer._id, newUser._id)
        
        if (referralResult.success && referralResult.bonusProcessed) {
          console.log(`✅ Referral bonus of ₦${referralResult.bonusAmount} given to ${referrer.email} for ${referralResult.totalReferrals} referrals`)
        }
      }
    }

    // Create new user's wallet
    await Wallet.create({ user: newUser._id, balance: 0 })

    const token = generateToken(newUser)
    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/register?ref=${newUser.referralCode}`

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        referralCode: newUser.referralCode,
        referralLink,
      },
    })
  } catch (err) {
    console.error("Signup Error:", err.message)
    res.status(500).json({ message: "Signup failed", error: err.message })
  }
})

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    const token = generateToken(user)
    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:4000'}/register?ref=${user.referralCode}`

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        referralLink,
      },
    })
  } catch (err) {
    console.error("Login Error:", err.message)
    res.status(500).json({ message: "Login failed", error: err.message })
  }
})

// UPDATE USER NAME ROUTE
router.patch("/update-name", verifyToken, async (req, res) => {
  const { name } = req.body
  const userId = req.user.id

  try {
    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" })
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ message: "Name must be at least 2 characters long" })
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ message: "Name must be less than 50 characters" })
    }

    // Update user name
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true, runValidators: true },
    ).select("-password")

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      message: "Name updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        referralCode: updatedUser.referralCode,
      },
    })
  } catch (err) {
    console.error("Update name error:", err)
    res.status(500).json({ message: "Failed to update name", error: err.message })
  }
})

export default router
