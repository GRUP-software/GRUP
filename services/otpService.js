import OTP from '../models/OTP.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

class OTPService {
    constructor() {
        this.cleanupInterval = null;
        this.startCleanupScheduler();
    }

    // Start automatic cleanup of expired OTPs
    startCleanupScheduler() {
        // Clean up expired OTPs every hour
        this.cleanupInterval = setInterval(async () => {
            try {
                const deletedCount = await OTP.cleanupExpired();
                if (deletedCount > 0) {
                    logger.info(`🧹 Cleaned up ${deletedCount} expired OTPs`);
                }
            } catch (error) {
                logger.error('❌ Error cleaning up expired OTPs:', error);
            }
        }, 60 * 60 * 1000); // 1 hour
    }

    // Stop cleanup scheduler
    stopCleanupScheduler() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    // Generate and send OTP for signup
    async sendSignupOTP(email, signupData) {
        try {
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return {
                    success: false,
                    message: 'User already exists with this email'
                };
            }

            // Check for recent OTP requests (rate limiting)
            const recentOTP = await OTP.findOne({
                email,
                type: 'signup',
                createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes
            });

            if (recentOTP) {
                return {
                    success: false,
                    message: 'Please wait 2 minutes before requesting another OTP'
                };
            }

            // Generate new OTP
            const otpCode = OTP.generateOTP();
            
            // Hash password before storing
            const hashedPassword = await bcrypt.hash(signupData.password, 10);

            // Create OTP record
            const otpRecord = new OTP({
                email,
                otp: otpCode,
                type: 'signup',
                purpose: 'user_signup',
                metadata: {
                    name: signupData.name,
                    password: hashedPassword, // Store hashed password
                    referralCode: signupData.referralCode,
                    secretRecoveryKey: signupData.secretRecoveryKey,
                    phone: signupData.phone
                }
            });

            await otpRecord.save();

            // Send email (will be logged if email service not configured)
            const emailResult = await emailService.sendEmail(
                email,
                'Welcome to Grup - Verify Your Email',
                emailService.generateSignupOTPEmail({
                    otp: otpCode,
                    name: signupData.name,
                    email
                }),
                `Welcome to Grup! Your verification code is: ${otpCode}. This code expires in 10 minutes.`
            );

            logger.info(`📧 Signup OTP sent to ${email}: ${otpCode}`);

            return {
                success: true,
                message: 'OTP sent successfully',
                emailSent: emailResult.success,
                expiresIn: 10 * 60 * 1000 // 10 minutes in milliseconds
            };

        } catch (error) {
            logger.error('❌ Error sending signup OTP:', error);
            return {
                success: false,
                message: 'Failed to send OTP',
                error: error.message
            };
        }
    }

    // Generate and send OTP for password reset
    async sendPasswordResetOTP(email) {
        try {
            // Check if user exists
            const user = await User.findOne({ email });
            if (!user) {
                return {
                    success: false,
                    message: 'User not found with this email'
                };
            }

            // Check for recent OTP requests (rate limiting)
            const recentOTP = await OTP.findOne({
                email,
                type: 'password_reset',
                createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // 2 minutes
            });

            if (recentOTP) {
                return {
                    success: false,
                    message: 'Please wait 2 minutes before requesting another OTP'
                };
            }

            // Generate new OTP
            const otpCode = OTP.generateOTP();

            // Create OTP record
            const otpRecord = new OTP({
                email,
                otp: otpCode,
                type: 'password_reset',
                purpose: 'password_reset',
                metadata: {
                    userId: user._id,
                    name: user.name
                }
            });

            await otpRecord.save();

            // Send email
            const emailResult = await emailService.sendEmail(
                email,
                'Password Reset - Grup',
                emailService.generatePasswordResetOTPEmail({
                    otp: otpCode,
                    name: user.name,
                    email
                }),
                `Password reset code: ${otpCode}. This code expires in 10 minutes.`
            );

            logger.info(`📧 Password reset OTP sent to ${email}: ${otpCode}`);

            return {
                success: true,
                message: 'OTP sent successfully',
                emailSent: emailResult.success,
                expiresIn: 10 * 60 * 1000
            };

        } catch (error) {
            logger.error('❌ Error sending password reset OTP:', error);
            return {
                success: false,
                message: 'Failed to send OTP',
                error: error.message
            };
        }
    }

    // Generate and send OTP for email verification
    async sendEmailVerificationOTP(email, userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            // Check for recent OTP requests
            const recentOTP = await OTP.findOne({
                email,
                type: 'email_verification',
                createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
            });

            if (recentOTP) {
                return {
                    success: false,
                    message: 'Please wait 2 minutes before requesting another OTP'
                };
            }

            // Generate new OTP
            const otpCode = OTP.generateOTP();

            // Create OTP record
            const otpRecord = new OTP({
                email,
                otp: otpCode,
                type: 'email_verification',
                purpose: 'email_verification',
                metadata: {
                    userId: user._id,
                    name: user.name
                }
            });

            await otpRecord.save();

            // Send email
            const emailResult = await emailService.sendEmail(
                email,
                'Email Verification - Grup',
                emailService.generateEmailVerificationOTPEmail({
                    otp: otpCode,
                    name: user.name,
                    email
                }),
                `Email verification code: ${otpCode}. This code expires in 10 minutes.`
            );

            logger.info(`📧 Email verification OTP sent to ${email}: ${otpCode}`);

            return {
                success: true,
                message: 'OTP sent successfully',
                emailSent: emailResult.success,
                expiresIn: 10 * 60 * 1000
            };

        } catch (error) {
            logger.error('❌ Error sending email verification OTP:', error);
            return {
                success: false,
                message: 'Failed to send OTP',
                error: error.message
            };
        }
    }

    // Verify OTP for signup
    async verifySignupOTP(email, otp) {
        try {
            const otpRecord = await OTP.findOne({
                email,
                type: 'signup',
                isUsed: false
            }).sort({ createdAt: -1 });

            if (!otpRecord) {
                return {
                    success: false,
                    message: 'No valid OTP found for this email'
                };
            }

            const verification = otpRecord.verifyOTP(otp);
            
            if (!verification.valid) {
                await otpRecord.save(); // Save attempt count
                
                const messages = {
                    expired: 'OTP has expired',
                    already_used: 'OTP has already been used',
                    max_attempts_exceeded: 'Maximum attempts exceeded. Please request a new OTP',
                    invalid_otp: 'Invalid OTP'
                };

                return {
                    success: false,
                    message: messages[verification.reason] || 'Invalid OTP',
                    reason: verification.reason
                };
            }

            // Mark OTP as used
            await otpRecord.markAsUsed();

            // Return signup data for user creation
            return {
                success: true,
                message: 'OTP verified successfully',
                signupData: otpRecord.metadata
            };

        } catch (error) {
            logger.error('❌ Error verifying signup OTP:', error);
            return {
                success: false,
                message: 'Failed to verify OTP',
                error: error.message
            };
        }
    }

    // Verify OTP for password reset
    async verifyPasswordResetOTP(email, otp) {
        try {
            const otpRecord = await OTP.findOne({
                email,
                type: 'password_reset',
                isUsed: false
            }).sort({ createdAt: -1 });

            if (!otpRecord) {
                return {
                    success: false,
                    message: 'No valid OTP found for this email'
                };
            }

            const verification = otpRecord.verifyOTP(otp);
            
            if (!verification.valid) {
                await otpRecord.save();
                
                const messages = {
                    expired: 'OTP has expired',
                    already_used: 'OTP has already been used',
                    max_attempts_exceeded: 'Maximum attempts exceeded. Please request a new OTP',
                    invalid_otp: 'Invalid OTP'
                };

                return {
                    success: false,
                    message: messages[verification.reason] || 'Invalid OTP',
                    reason: verification.reason
                };
            }

            // Mark OTP as used
            await otpRecord.markAsUsed();

            return {
                success: true,
                message: 'OTP verified successfully',
                userId: otpRecord.metadata.userId
            };

        } catch (error) {
            logger.error('❌ Error verifying password reset OTP:', error);
            return {
                success: false,
                message: 'Failed to verify OTP',
                error: error.message
            };
        }
    }

    // Verify OTP for email verification
    async verifyEmailVerificationOTP(email, otp) {
        try {
            const otpRecord = await OTP.findOne({
                email,
                type: 'email_verification',
                isUsed: false
            }).sort({ createdAt: -1 });

            if (!otpRecord) {
                return {
                    success: false,
                    message: 'No valid OTP found for this email'
                };
            }

            const verification = otpRecord.verifyOTP(otp);
            
            if (!verification.valid) {
                await otpRecord.save();
                
                const messages = {
                    expired: 'OTP has expired',
                    already_used: 'OTP has already been used',
                    max_attempts_exceeded: 'Maximum attempts exceeded. Please request a new OTP',
                    invalid_otp: 'Invalid OTP'
                };

                return {
                    success: false,
                    message: messages[verification.reason] || 'Invalid OTP',
                    reason: verification.reason
                };
            }

            // Mark OTP as used
            await otpRecord.markAsUsed();

            return {
                success: true,
                message: 'Email verified successfully',
                userId: otpRecord.metadata.userId
            };

        } catch (error) {
            logger.error('❌ Error verifying email verification OTP:', error);
            return {
                success: false,
                message: 'Failed to verify OTP',
                error: error.message
            };
        }
    }

    // Get OTP status (for debugging)
    async getOTPStatus(email, type) {
        try {
            const otpRecord = await OTP.findOne({
                email,
                type
            }).sort({ createdAt: -1 });

            if (!otpRecord) {
                return {
                    exists: false,
                    message: 'No OTP found'
                };
            }

            return {
                exists: true,
                isUsed: otpRecord.isUsed,
                isExpired: otpRecord.expiresAt < new Date(),
                attempts: otpRecord.attempts,
                createdAt: otpRecord.createdAt,
                expiresAt: otpRecord.expiresAt,
                timeRemaining: Math.max(0, otpRecord.expiresAt.getTime() - Date.now())
            };

        } catch (error) {
            logger.error('❌ Error getting OTP status:', error);
            return {
                exists: false,
                error: error.message
            };
        }
    }

    // Clean up expired OTPs manually
    async cleanupExpiredOTPs() {
        try {
            const deletedCount = await OTP.cleanupExpired();
            logger.info(`🧹 Manually cleaned up ${deletedCount} expired OTPs`);
            return { success: true, deletedCount };
        } catch (error) {
            logger.error('❌ Error cleaning up expired OTPs:', error);
            return { success: false, error: error.message };
        }
    }
}

const otpService = new OTPService();
export default otpService;

