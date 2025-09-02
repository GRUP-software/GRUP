import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

// Load environment variables
dotenv.config();

async function migrateRecoveryKeys() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to database");

    // Find users without secret recovery key
    const usersWithoutRecoveryKey = await User.find({
      $or: [
        { secretRecoveryKey: { $exists: false } },
        { secretRecoveryKey: null },
        { secretRecoveryKey: "" },
      ],
    });

    console.log(
      `📊 Found ${usersWithoutRecoveryKey.length} users without secret recovery key`,
    );

    if (usersWithoutRecoveryKey.length === 0) {
      console.log("✅ All users already have secret recovery keys");
      return;
    }

    // For each user without a recovery key, we'll set a temporary one
    // In a real scenario, you might want to force these users to set their own
    for (const user of usersWithoutRecoveryKey) {
      // Generate a temporary recovery key based on user's email and a timestamp
      const tempRecoveryKey = `temp_${user.email.split("@")[0]}_${Date.now()}`;

      // Update user with temporary recovery key
      await User.findByIdAndUpdate(user._id, {
        secretRecoveryKey: tempRecoveryKey,
      });

      console.log(`✅ Set temporary recovery key for ${user.email}`);
    }

    console.log("✅ Migration completed successfully");
    console.log(
      "⚠️  IMPORTANT: Users with temporary recovery keys should be prompted to set their own recovery key on next login",
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("✅ Disconnected from database");
  }
}

// Run the migration
migrateRecoveryKeys();
