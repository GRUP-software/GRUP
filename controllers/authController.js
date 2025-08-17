import User from "../models/User.js"
import Wallet from "../models/Wallet.js"
import Transaction from "../models/Transaction.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { nanoid } from "nanoid"
import { addReferral } from "../utils/referralBonusService.js"

export const signup = async (req, res) => {
  const { name, email, password, referralCode } = req.body

  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ message: "Email already exists" })

    const hashedPassword = await bcrypt.hash(password, 10)
    const generatedReferralCode = nanoid(8)

    // Find referrer if referral code is provided
    let referrer = null
    let referredBy = null
    
    if (referralCode) {
      referrer = await User.findOne({ referralCode })
      if (referrer) {
        referredBy = referrer._id
      }
    }

    const wallet = new Wallet({ balance: 0 })
    await wallet.save()

    const user = new User({
      name,
      email,
      password: hashedPassword,
      referralCode: generatedReferralCode,
      referredBy: referredBy, // Set to ObjectId or null
      wallet: wallet._id,
    })

    await user.save()

    // Handle referral logic using the service
    if (referrer) {
      const referralResult = await addReferral(referrer._id, user._id)
      
      if (referralResult.success && referralResult.bonusProcessed) {
        console.log(`✅ Referral bonus of ₦${referralResult.bonusAmount} given to ${referrer.email} for ${referralResult.totalReferrals} referrals`)
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
      },
    })
  } catch (err) {
    console.error("Signup error:", err)
    res.status(500).json({ message: "Signup failed", error: err.message })
  }
}

export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: "Invalid credentials" })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
      },
    })
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message })
  }
}

export const updateUserName = async (req, res) => {
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
}
