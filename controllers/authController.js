import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

export const signup = async (req, res) => {
  const { name, email, password, referralCode } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedReferralCode = nanoid(8);

    const wallet = new Wallet({ balance: 0 });
    await wallet.save();

    const user = new User({
      name,
      email,
      password: hashedPassword,
      referralCode: generatedReferralCode,
      referredBy: referralCode || null,
      wallet: wallet._id,
    });

    await user.save();

    // Handle referral logic - only process after user is saved
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        // Initialize referredUsers array if it doesn't exist
        if (!referrer.referredUsers) {
          referrer.referredUsers = [];
        }

        // Add to referredUsers if not already added
        if (!referrer.referredUsers.includes(user._id)) {
          referrer.referredUsers.push(user._id);
        }

        // Check if referrer now has 3 or more referrals and hasn't received bonus yet
        if (referrer.referredUsers.length >= 3 && !referrer.hasReceivedReferralBonus) {
          let refWallet = await Wallet.findById(referrer.wallet);
          if (!refWallet) {
            refWallet = await Wallet.create({ user: referrer._id, balance: 500 });
            referrer.wallet = refWallet._id;
          } else {
            refWallet.balance += 500;
            await refWallet.save();
          }

          // Create transaction record
          await Transaction.create({
            wallet: refWallet._id,
            type: 'credit',
            amount: 500,
            reason: 'REFERRAL_BONUS',
            description: `Referral bonus for inviting 3 users`,
          });

          referrer.hasReceivedReferralBonus = true;
        }

        await referrer.save();
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};
