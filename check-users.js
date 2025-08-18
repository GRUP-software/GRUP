import mongoose from 'mongoose';
import User from './models/User.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grup');

console.log('🔍 Checking all users in database...');

const users = await User.find({}).select('_id email name referralCode referredUsers referralStats');

console.log(`📊 Found ${users.length} users:`);

users.forEach(user => {
  console.log(`\n👤 User: ${user.email}`);
  console.log(`   ID: ${user._id}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Referral Code: ${user.referralCode}`);
  console.log(`   Referred Users: ${user.referredUsers?.length || 0}`);
  console.log(`   Referral Stats:`, user.referralStats);
});

process.exit(0);

