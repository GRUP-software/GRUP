import dotenv from 'dotenv'
import mongoose from 'mongoose'
import User from './models/User.js'

// Load environment variables
dotenv.config()

async function findAdminUser() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to database')

    // Find admin user by email
    const adminUser = await User.findOne({ email: 'admin@grup.com' })
    
    if (adminUser) {
      console.log('✅ Admin user found:')
      console.log(`   ID: ${adminUser._id}`)
      console.log(`   Name: ${adminUser.name}`)
      console.log(`   Email: ${adminUser.email}`)
      console.log(`   Phone: ${adminUser.phone}`)
      console.log('\n📝 Add this to your .env file:')
      console.log(`ADMIN_USER_ID=${adminUser._id}`)
    } else {
      console.log('❌ Admin user not found')
      console.log('Creating admin user...')
      
      // Create admin user if not exists
      const newAdmin = new User({
        name: 'Admin',
        email: 'admin@grup.com',
        password: '12345678',
        phone: '+2348012345678'
      })
      
      await newAdmin.save()
      console.log('✅ Admin user created:')
      console.log(`   ID: ${newAdmin._id}`)
      console.log('\n📝 Add this to your .env file:')
      console.log(`ADMIN_USER_ID=${newAdmin._id}`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('✅ Disconnected from database')
  }
}

// Run the script
findAdminUser()
