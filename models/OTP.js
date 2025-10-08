import mongoose from 'mongoose';

const { Schema } = mongoose;

const otpSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    
    otp: {
        type: String,
        required: true,
        length: 6, // 6-digit OTP
    },
    
    type: {
        type: String,
        enum: ['signup', 'password_reset', 'email_verification'],
        required: true,
    },
    
    purpose: {
        type: String,
        enum: ['user_signup', 'password_reset', 'email_verification', 'admin_action'],
        required: true,
    },
    
    // Additional data for different OTP types
    metadata: {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        phone: String,
        name: String,
        // For password reset
        resetToken: String,
        // For signup
        signupData: {
            name: String,
            password: String, // Will be hashed before saving
            referralCode: String,
            secretRecoveryKey: String,
        }
    },
    
    attempts: {
        type: Number,
        default: 0,
        max: 5, // Maximum 5 attempts
    },
    
    isUsed: {
        type: Boolean,
        default: false,
    },
    
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
    },
    
    usedAt: {
        type: Date,
    },
});

// Indexes for better performance
otpSchema.index({ email: 1, type: 1, createdAt: -1 });
otpSchema.index({ email: 1, otp: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired OTPs

// Static method to generate OTP
otpSchema.statics.generateOTP = function() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Static method to clean up expired OTPs
otpSchema.statics.cleanupExpired = async function() {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isUsed: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete used OTPs older than 24 hours
        ]
    });
    return result.deletedCount;
};

// Instance method to verify OTP
otpSchema.methods.verifyOTP = function(inputOTP) {
    // Check if OTP is expired
    if (this.expiresAt < new Date()) {
        return { valid: false, reason: 'expired' };
    }
    
    // Check if OTP is already used
    if (this.isUsed) {
        return { valid: false, reason: 'already_used' };
    }
    
    // Check if max attempts exceeded
    if (this.attempts >= 5) {
        return { valid: false, reason: 'max_attempts_exceeded' };
    }
    
    // Increment attempts
    this.attempts += 1;
    
    // Check if OTP matches
    if (this.otp === inputOTP) {
        this.isUsed = true;
        this.usedAt = new Date();
        return { valid: true };
    }
    
    return { valid: false, reason: 'invalid_otp' };
};

// Instance method to mark as used
otpSchema.methods.markAsUsed = function() {
    this.isUsed = true;
    this.usedAt = new Date();
    return this.save();
};

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;

