import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"

const { Schema } = mongoose

const userSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet" },
    referralCode: { type: String, unique: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    referredUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    
    // Enhanced referral tracking
    referralStats: {
      totalReferrals: { type: Number, default: 0 },
      totalBonusesEarned: { type: Number, default: 0 },
      lastBonusAt: { type: Number, default: 0 }, // Last bonus given at X referrals
      nextBonusAt: { type: Number, default: 3 }, // Next bonus at X referrals
    },

    // Location and delivery info
    defaultAddress: {
      street: String,
      city: String,
      state: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // Live user tracking
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    socketId: String,
  },
  {
    timestamps: true,
  },
)

// Combined pre-save hook
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10)
  }

  // Generate referral code if not set
  if (!this.referralCode) {
    this.referralCode = nanoid(8)
  }

  // Update referral stats
  if (this.referredUsers) {
    this.referralStats.totalReferrals = this.referredUsers.length
    // Fix: nextBonusAt should be the next multiple of 3 after current total
    // 0 referrals -> next bonus at 3
    // 1-2 referrals -> next bonus at 3
    // 3 referrals -> next bonus at 6
    // 4-5 referrals -> next bonus at 6
    // 6 referrals -> next bonus at 9
    this.referralStats.nextBonusAt = Math.ceil((this.referralStats.totalReferrals + 1) / 3) * 3
  }

  next()
})

// Password comparison method
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password)
}

// Method to check if user should receive referral bonus
userSchema.methods.shouldReceiveReferralBonus = function() {
  const totalReferrals = this.referredUsers?.length || 0
  const lastBonusAt = this.referralStats?.lastBonusAt || 0
  
  // Fix: Check if we have enough new referrals since last bonus
  const newReferrals = totalReferrals - lastBonusAt
  return newReferrals >= 3
}

// Method to calculate referral bonus amount
userSchema.methods.calculateReferralBonus = function() {
  const totalReferrals = this.referredUsers?.length || 0
  const lastBonusAt = this.referralStats?.lastBonusAt || 0
  
  if (totalReferrals <= lastBonusAt) return 0
  
  // Calculate how many complete sets of 3 referrals since last bonus
  const newReferrals = totalReferrals - lastBonusAt
  const completeSets = Math.floor(newReferrals / 3)
  
  return completeSets * 500 // ₦500 per 3 referrals
}

const User = mongoose.model("User", userSchema)
export default User
