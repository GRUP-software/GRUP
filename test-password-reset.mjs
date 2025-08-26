import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

async function testPasswordReset() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database');

    // Test 1: Create a test user
    console.log('\n🧪 Test 1: Creating test user...');
    
    const testEmail = 'test-password-reset@example.com';
    const testPassword = 'testpassword123';
    const testRecoveryKey = 'mysecretrecoverykey123';
    
    // Delete existing test user if exists
    await User.deleteOne({ email: testEmail });
    
    // Create new test user
    const testUser = new User({
      name: 'Test User',
      email: testEmail,
      password: testPassword,
      secretRecoveryKey: testRecoveryKey,
      phone: '+2348012345678'
    });
    
    await testUser.save();
    console.log('✅ Test user created successfully');

    // Test 2: Verify recovery key comparison works
    console.log('\n🧪 Test 2: Testing recovery key comparison...');
    
    const user = await User.findOne({ email: testEmail });
    const isKeyValid = await user.compareSecretRecoveryKey(testRecoveryKey);
    const isKeyInvalid = await user.compareSecretRecoveryKey('wrongkey');
    
    console.log(`✅ Correct key validation: ${isKeyValid}`);
    console.log(`✅ Wrong key validation: ${isKeyInvalid}`);
    
    if (isKeyValid && !isKeyInvalid) {
      console.log('✅ Recovery key comparison working correctly');
    } else {
      console.log('❌ Recovery key comparison failed');
    }

    // Test 3: Test password comparison
    console.log('\n🧪 Test 3: Testing password comparison...');
    
    const isPasswordValid = await user.comparePassword(testPassword);
    const isPasswordInvalid = await user.comparePassword('wrongpassword');
    
    console.log(`✅ Correct password validation: ${isPasswordValid}`);
    console.log(`✅ Wrong password validation: ${isPasswordInvalid}`);
    
    if (isPasswordValid && !isPasswordInvalid) {
      console.log('✅ Password comparison working correctly');
    } else {
      console.log('❌ Password comparison failed');
    }

    // Test 4: Test password update
    console.log('\n🧪 Test 4: Testing password update...');
    
    const newPassword = 'newpassword456';
    user.password = newPassword;
    await user.save();
    
    const isNewPasswordValid = await user.comparePassword(newPassword);
    const isOldPasswordValid = await user.comparePassword(testPassword);
    
    console.log(`✅ New password validation: ${isNewPasswordValid}`);
    console.log(`✅ Old password validation: ${isOldPasswordValid}`);
    
    if (isNewPasswordValid && !isOldPasswordValid) {
      console.log('✅ Password update working correctly');
    } else {
      console.log('❌ Password update failed');
    }

    // Test 5: Test recovery key update
    console.log('\n🧪 Test 5: Testing recovery key update...');
    
    const newRecoveryKey = 'newsecretkey789';
    user.secretRecoveryKey = newRecoveryKey;
    await user.save();
    
    const isNewKeyValid = await user.compareSecretRecoveryKey(newRecoveryKey);
    const isOldKeyValid = await user.compareSecretRecoveryKey(testRecoveryKey);
    
    console.log(`✅ New recovery key validation: ${isNewKeyValid}`);
    console.log(`✅ Old recovery key validation: ${isOldKeyValid}`);
    
    if (isNewKeyValid && !isOldKeyValid) {
      console.log('✅ Recovery key update working correctly');
    } else {
      console.log('❌ Recovery key update failed');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteOne({ email: testEmail });
    console.log('✅ Test user deleted');

    console.log('\n🎉 All password reset tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the test
testPasswordReset();
