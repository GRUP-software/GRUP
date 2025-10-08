import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import otpService from '../services/otpService.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for OTP requests
const otpRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 OTP requests per window
    message: {
        success: false,
        message: 'Too many OTP requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting for OTP verification
const verifyRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 verification attempts per window
    message: {
        success: false,
        message: 'Too many verification attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Send OTP for signup
router.post('/signup/send', otpRateLimit, async (req, res) => {
    try {
        const { email, name, password, referralCode, secretRecoveryKey, phone } = req.body;

        // Validate required fields
        if (!email || !name || !password || !secretRecoveryKey) {
            return res.status(400).json({
                success: false,
                message: 'Email, name, password, and secret recovery key are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate secret recovery key
        if (secretRecoveryKey.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Secret recovery key must be at least 8 characters long'
            });
        }

        const result = await otpService.sendSignupOTP(email, {
            name,
            password,
            referralCode,
            secretRecoveryKey,
            phone
        });

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                emailSent: result.emailSent,
                expiresIn: result.expiresIn
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Send signup OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Verify OTP for signup
router.post('/signup/verify', verifyRateLimit, async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const result = await otpService.verifySignupOTP(email, otp);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                signupData: result.signupData
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                reason: result.reason
            });
        }

    } catch (error) {
        console.error('Verify signup OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Send OTP for password reset
router.post('/password-reset/send', otpRateLimit, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        const result = await otpService.sendPasswordResetOTP(email);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                emailSent: result.emailSent,
                expiresIn: result.expiresIn
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Send password reset OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Verify OTP for password reset
router.post('/password-reset/verify', verifyRateLimit, async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const result = await otpService.verifyPasswordResetOTP(email, otp);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                userId: result.userId
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                reason: result.reason
            });
        }

    } catch (error) {
        console.error('Verify password reset OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Send OTP for email verification (authenticated users only)
router.post('/email-verification/send', verifyToken, otpRateLimit, async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.user.id;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        const result = await otpService.sendEmailVerificationOTP(email, userId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                emailSent: result.emailSent,
                expiresIn: result.expiresIn
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Send email verification OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Verify OTP for email verification
router.post('/email-verification/verify', verifyRateLimit, async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        const result = await otpService.verifyEmailVerificationOTP(email, otp);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                userId: result.userId
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
                reason: result.reason
            });
        }

    } catch (error) {
        console.error('Verify email verification OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get OTP status (for debugging - authenticated users only)
router.get('/status/:email/:type', verifyToken, async (req, res) => {
    try {
        const { email, type } = req.params;

        if (!['signup', 'password_reset', 'email_verification'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP type'
            });
        }

        const result = await otpService.getOTPStatus(email, type);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Get OTP status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Clean up expired OTPs (admin only - for debugging)
router.post('/cleanup', verifyToken, async (req, res) => {
    try {
        // Note: In production, you might want to add admin role check here
        const result = await otpService.cleanupExpiredOTPs();

        res.json({
            success: result.success,
            message: result.success ? 'Cleanup completed' : 'Cleanup failed',
            deletedCount: result.deletedCount,
            error: result.error
        });

    } catch (error) {
        console.error('Cleanup OTPs error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

export default router;

