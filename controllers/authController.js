import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
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

    
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        const refWallet = await Wallet.findById(referrer.wallet);
        if (refWallet) {
          refWallet.balance += 100; 
          await refWallet.save();
        }
      }
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token });
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

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};
