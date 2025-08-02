import mongoose from "mongoose"
import bcrypt from "bcryptjs"

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
    hasReceivedReferralBonus: { type: Boolean, default: false },

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
    this.referralCode = this._id?.toString().slice(-6)
  }

  next()
})

// Password comparison method
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password)
}

const User = mongoose.model("User", userSchema)
export default User
