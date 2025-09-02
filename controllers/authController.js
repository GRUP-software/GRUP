import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import Transaction from "../models/Transaction.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { addReferral } from "../utils/referralBonusService.js";

export const signup = async (req, res) => {
  const { name, email, password, referralCode, secretRecoveryKey } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    // Validate secret recovery key
    if (!secretRecoveryKey || secretRecoveryKey.length < 8) {
      return res.status(400).json({
        message: "Secret recovery key must be at least 8 characters long",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedReferralCode = nanoid(8);

    // Find referrer if referral code is provided
    let referrer = null;
    let referredBy = null;

    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
      }
    }

    const wallet = new Wallet({ balance: 0 });
    await wallet.save();

    const user = new User({
      name,
      email,
      password: hashedPassword,
      secretRecoveryKey,
      referralCode: generatedReferralCode,
      referredBy: referredBy, // Set to ObjectId or null
      wallet: wallet._id,
    });

    await user.save();

    // Handle referral logic using the service
    if (referrer) {
      const referralResult = await addReferral(referrer._id, user._id);

      if (referralResult.success && referralResult.bonusProcessed) {
        console.log(
          `✅ Referral bonus of ₦${referralResult.bonusAmount} given to ${referrer.email} for ${referralResult.totalReferrals} referrals`,
        );
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

// Verify secret recovery key for password reset
export const verifyRecoveryKey = async (req, res) => {
  const { email, secretRecoveryKey } = req.body;

  try {
    // Validate input
    if (!email || !secretRecoveryKey) {
      return res
        .status(400)
        .json({ message: "Email and secret recovery key are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Verify secret recovery key
    const isKeyValid = await user.compareSecretRecoveryKey(secretRecoveryKey);
    if (!isKeyValid) {
      return res.status(400).json({ message: "Invalid secret recovery key" });
    }

    // Generate a temporary token for password reset (valid for 15 minutes)
    const resetToken = jwt.sign(
      { id: user._id, type: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.json({
      message: "Secret recovery key verified successfully",
      resetToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Verify recovery key error:", err);
    res
      .status(500)
      .json({ message: "Verification failed", error: err.message });
  }
};

// Reset password using verified recovery key
export const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    // Validate input
    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ message: "Reset token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Check if token is for password reset
    if (decoded.type !== "password_reset") {
      return res.status(400).json({ message: "Invalid token type" });
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new login token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Password reset successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res
      .status(500)
      .json({ message: "Password reset failed", error: err.message });
  }
};

// Update secret recovery key (for authenticated users)
export const updateSecretRecoveryKey = async (req, res) => {
  const { currentPassword, newSecretRecoveryKey } = req.body;
  const userId = req.user.id;

  try {
    // Validate input
    if (!currentPassword || !newSecretRecoveryKey) {
      return res.status(400).json({
        message: "Current password and new secret recovery key are required",
      });
    }

    if (newSecretRecoveryKey.length < 8) {
      return res.status(400).json({
        message: "Secret recovery key must be at least 8 characters long",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update secret recovery key
    user.secretRecoveryKey = newSecretRecoveryKey;
    await user.save();

    res.json({
      message: "Secret recovery key updated successfully",
    });
  } catch (err) {
    console.error("Update secret recovery key error:", err);
    res.status(500).json({
      message: "Failed to update secret recovery key",
      error: err.message,
    });
  }
};

// Request recovery key reset (for users who forgot their recovery key)
export const requestRecoveryKeyReset = async (req, res) => {
  const { email, phone, reason } = req.body;

  try {
    // Validate input
    if (!email || !phone) {
      return res
        .status(400)
        .json({ message: "Email and phone number are required" });
    }

    // Find user by email and phone
    const user = await User.findOne({ email, phone });
    if (!user) {
      return res.status(400).json({
        message: "User not found with provided email and phone number",
      });
    }

    // Check if there's already a pending request
    if (user.recoveryKeyResetRequest?.status === "pending") {
      return res.status(400).json({
        message:
          "You already have a pending recovery key reset request. Please wait for admin approval.",
      });
    }

    // Create recovery key reset request
    user.recoveryKeyResetRequest = {
      requestedAt: new Date(),
      status: "pending",
    };
    await user.save();

    res.json({
      message:
        "Recovery key reset request submitted successfully. An admin will review your request.",
      requestId: user._id,
    });
  } catch (err) {
    console.error("Request recovery key reset error:", err);
    res.status(500).json({
      message: "Failed to submit recovery key reset request",
      error: err.message,
    });
  }
};

// Admin: Get all pending recovery key reset requests
export const getRecoveryKeyResetRequests = async (req, res) => {
  try {
    const requests = await User.find({
      "recoveryKeyResetRequest.status": "pending",
    }).select("name email phone recoveryKeyResetRequest");

    res.json({
      requests: requests.map((user) => ({
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        requestedAt: user.recoveryKeyResetRequest.requestedAt,
      })),
    });
  } catch (err) {
    console.error("Get recovery key reset requests error:", err);
    res.status(500).json({
      message: "Failed to get recovery key reset requests",
      error: err.message,
    });
  }
};

// Admin: Approve recovery key reset request
export const approveRecoveryKeyReset = async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.recoveryKeyResetRequest?.status !== "pending") {
      return res
        .status(400)
        .json({ message: "No pending recovery key reset request found" });
    }

    // Generate temporary recovery key (valid for 24 hours)
    const tempKey = `temp_${user.email.split("@")[0]}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with approved request and temporary key
    user.recoveryKeyResetRequest = {
      ...user.recoveryKeyResetRequest,
      status: "approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      temporaryKey: tempKey,
      expiresAt: expiresAt,
    };
    await user.save();

    res.json({
      message: "Recovery key reset request approved",
      temporaryKey: tempKey,
      expiresAt: expiresAt,
    });
  } catch (err) {
    console.error("Approve recovery key reset error:", err);
    res.status(500).json({
      message: "Failed to approve recovery key reset request",
      error: err.message,
    });
  }
};

// Admin: Reject recovery key reset request
export const rejectRecoveryKeyReset = async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.recoveryKeyResetRequest?.status !== "pending") {
      return res
        .status(400)
        .json({ message: "No pending recovery key reset request found" });
    }

    // Update user with rejected request
    user.recoveryKeyResetRequest = {
      ...user.recoveryKeyResetRequest,
      status: "rejected",
    };
    await user.save();

    res.json({
      message: "Recovery key reset request rejected",
    });
  } catch (err) {
    console.error("Reject recovery key reset error:", err);
    res.status(500).json({
      message: "Failed to reject recovery key reset request",
      error: err.message,
    });
  }
};

// User: Use temporary recovery key to reset their recovery key
export const useTemporaryRecoveryKey = async (req, res) => {
  const { email, temporaryKey, newRecoveryKey } = req.body;

  try {
    // Validate input
    if (!email || !temporaryKey || !newRecoveryKey) {
      return res.status(400).json({
        message: "Email, temporary key, and new recovery key are required",
      });
    }

    if (newRecoveryKey.length < 8) {
      return res.status(400).json({
        message: "New recovery key must be at least 8 characters long",
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if user has an approved request with matching temporary key
    if (
      user.recoveryKeyResetRequest?.status !== "approved" ||
      user.recoveryKeyResetRequest?.temporaryKey !== temporaryKey
    ) {
      return res
        .status(400)
        .json({ message: "Invalid temporary recovery key" });
    }

    // Check if temporary key has expired
    if (user.recoveryKeyResetRequest?.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ message: "Temporary recovery key has expired" });
    }

    // Update user with new recovery key and mark request as completed
    user.secretRecoveryKey = newRecoveryKey;
    user.recoveryKeyResetRequest = {
      ...user.recoveryKeyResetRequest,
      status: "completed",
    };
    await user.save();

    res.json({
      message:
        "Recovery key updated successfully. You can now use this key to reset your password.",
    });
  } catch (err) {
    console.error("Use temporary recovery key error:", err);
    res
      .status(500)
      .json({ message: "Failed to update recovery key", error: err.message });
  }
};

export const updateUserName = async (req, res) => {
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
};
