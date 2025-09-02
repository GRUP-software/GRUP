import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { addReferral } from "../utils/referralBonusService.js";
import {
  signup,
  login,
  updateUserName,
  verifyRecoveryKey,
  resetPassword,
  updateSecretRecoveryKey,
  requestRecoveryKeyReset,
  getRecoveryKeyResetRequests,
  approveRecoveryKeyReset,
  rejectRecoveryKeyReset,
  useTemporaryRecoveryKey,
} from "../controllers/authController.js";

const router = express.Router();
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "7c52c79e0f80ad32abfec954fc7bc171ae9092423ba0d2aee378c1bd23381d6269e7de2493f59549c84b7fcfa2e308dae419c63fee9c2ac15ea021f5be231885";

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
};

// SIGNUP ROUTE
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, referralCode, phone, secretRecoveryKey } =
      req.body;

    // Validate phone number format
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    if (!phone.startsWith("+234")) {
      return res.status(400).json({
        message:
          "Please enter a valid Nigerian WhatsApp number starting with +234",
      });
    }

    if (phone.length !== 14) {
      return res.status(400).json({
        message: "Please enter a valid 11-digit Nigerian phone number",
      });
    }

    // Validate secret recovery key
    if (!secretRecoveryKey || secretRecoveryKey.length < 8) {
      return res.status(400).json({
        message: "Secret recovery key must be at least 8 characters long",
      });
    }

    // Check if email already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res
        .status(400)
        .json({ message: "Email already associated with an account" });
    }

    // Check if phone number already exists
    const existingUserByPhone = await User.findOne({ phone });
    if (existingUserByPhone) {
      return res
        .status(400)
        .json({ message: "Phone number already associated with an account" });
    }

    const newUser = new User({
      name,
      email,
      password,
      phone,
      secretRecoveryKey,
    });

    // Handle referral logic using the new service
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        newUser.referredBy = referrer._id;
      }
    }

    await newUser.save();

    // Handle referral logic using the service
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        const referralResult = await addReferral(referrer._id, newUser._id);

        if (referralResult.success && referralResult.bonusProcessed) {
          console.log(
            `✅ Referral bonus of ₦${referralResult.bonusAmount} given to ${referrer.email} for ${referralResult.totalReferrals} referrals`,
          );
        }
      }
    }

    // Create new user's wallet
    await Wallet.create({ user: newUser._id, balance: 0 });

    const token = generateToken(newUser);
    const referralLink = `${process.env.FRONTEND_URL || "https://grupclient.netlify.app"}/register?ref=${newUser.referralCode}`;

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        referralCode: newUser.referralCode,
        referralLink,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err.message);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    const referralLink = `${process.env.FRONTEND_URL || "https://grupclient.netlify.app"}/register?ref=${user.referralCode}`;

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        referralCode: user.referralCode,
        referralLink,
      },
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// PASSWORD RESET ROUTES
router.post("/verify-recovery-key", verifyRecoveryKey);
router.post("/reset-password", resetPassword);
router.patch("/update-recovery-key", verifyToken, updateSecretRecoveryKey);

// RECOVERY KEY RESET REQUEST ROUTES
router.post("/request-recovery-key-reset", requestRecoveryKeyReset);
router.post("/use-temporary-recovery-key", useTemporaryRecoveryKey);

// ADMIN ROUTES (require authentication)
router.get(
  "/recovery-key-reset-requests",
  verifyToken,
  getRecoveryKeyResetRequests,
);
router.post(
  "/approve-recovery-key-reset/:userId",
  verifyToken,
  approveRecoveryKeyReset,
);
router.post(
  "/reject-recovery-key-reset/:userId",
  verifyToken,
  rejectRecoveryKeyReset,
);

// UPDATE USER NAME ROUTE
router.patch("/update-name", verifyToken, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  try {
    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (name.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "Name must be at least 2 characters long" });
    }

    if (name.trim().length > 50) {
      return res
        .status(400)
        .json({ message: "Name must be less than 50 characters" });
    }

    // Update user name
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Name updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        referralCode: updatedUser.referralCode,
      },
    });
  } catch (err) {
    console.error("Update name error:", err);
    res
      .status(500)
      .json({ message: "Failed to update name", error: err.message });
  }
});

export default router;
