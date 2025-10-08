import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for admin login attempts
const adminLoginLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        message: 'Too many admin login attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin credentials - MUST be set in environment variables
const ADMIN_CREDENTIALS = {
    email: process.env.ADMIN_EMAIL || 'admin@grup.com',
    password: process.env.ADMIN_PASSWORD_HASH || '$2b$10$defaultHash', // Use bcrypt hash
};

// Admin login endpoint specifically for the upload tool
router.post('/k8j3h2g7', adminLoginLimit, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check admin credentials
        if (
            email === ADMIN_CREDENTIALS.email &&
            password === ADMIN_CREDENTIALS.password
        ) {
            // Generate a simple admin token (in production, use proper JWT)
            const adminToken = Buffer.from(
                `${email}:${password}:admin:${Date.now()}`
            ).toString('base64');

            res.json({
                success: true,
                token: adminToken,
                message: 'Admin login successful',
                user: {
                    email: email,
                    role: 'admin',
                },
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid admin credentials',
            });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Admin login failed',
            error: error.message,
        });
    }
});

// Verify admin token middleware
export const verifyAdminToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Admin token missing' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [email, password, role] = decoded.split(':');

        if (
            email === ADMIN_CREDENTIALS.email &&
            password === ADMIN_CREDENTIALS.password &&
            role === 'admin'
        ) {
            req.admin = { email, role: 'admin' };
            next();
        } else {
            res.status(401).json({ message: 'Invalid admin token' });
        }
    } catch (error) {
        res.status(401).json({ message: 'Invalid admin token format' });
    }
};

export default router;
