import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaymentHistory from '../models/PaymentHistory.js';

// Load environment variables
dotenv.config();

const migrateToFlutterwave = async () => {
    try {
        console.log('🚀 Starting migration from Paystack to Flutterwave...');

        // Connect to database
        await mongoose.connect(
            process.env.MONGODB_URI ||
                process.env.MONGO_URI ||
                'mongodb://localhost:27017/GRUP'
        );
        console.log('✅ Connected to database');

        // Find all PaymentHistory records with paystackReference
        const paymentHistories = await PaymentHistory.find({
            paystackReference: { $exists: true, $ne: null },
        });

        console.log(
            `📊 Found ${paymentHistories.length} payment records to migrate`
        );

        let migratedCount = 0;
        let skippedCount = 0;

        for (const payment of paymentHistories) {
            try {
                // Check if already has flutterwaveReference
                if (payment.flutterwaveReference) {
                    console.log(
                        `⏭️  Skipping ${payment._id} - already has flutterwaveReference`
                    );
                    skippedCount++;
                    continue;
                }

                // Migrate paystackReference to flutterwaveReference
                payment.flutterwaveReference = payment.paystackReference;
                payment.flutterwaveAmount = payment.paystackAmount || 0;

                // Clear old Paystack fields
                payment.paystackReference = undefined;
                payment.paystackAmount = undefined;

                await payment.save();
                console.log(`✅ Migrated payment ${payment._id}`);
                migratedCount++;
            } catch (error) {
                console.error(
                    `❌ Error migrating payment ${payment._id}:`,
                    error.message
                );
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   Total records found: ${paymentHistories.length}`);
        console.log(`   Successfully migrated: ${migratedCount}`);
        console.log(`   Skipped (already migrated): ${skippedCount}`);
        console.log(
            `   Failed: ${paymentHistories.length - migratedCount - skippedCount}`
        );

        console.log('\n🎉 Migration completed!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database');
        process.exit(0);
    }
};

// Run migration
migrateToFlutterwave();
