import dotenv from 'dotenv'
import mongoose from 'mongoose'

// Load environment variables
dotenv.config()

async function testWhatsAppSetup() {
  try {
    console.log('🔍 Testing WhatsApp Integration Setup...')
    
    // Check environment variables
    console.log('\n📋 Environment Variables:')
    console.log('WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Set' : '❌ Missing')
    console.log('WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ Set' : '❌ Missing')
    console.log('WHATSAPP_VERIFY_TOKEN:', process.env.WHATSAPP_VERIFY_TOKEN ? '✅ Set' : '❌ Missing')
    console.log('ADMIN_USER_ID:', process.env.ADMIN_USER_ID ? '✅ Set' : '❌ Missing')
    
    // Test database connection
    console.log('\n🗄️ Database Connection:')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Database connected')
    
    // Test WhatsApp service import
    console.log('\n📱 WhatsApp Service:')
    try {
      const whatsappService = await import('./services/whatsappService.js')
      console.log('✅ WhatsApp service imported successfully')
      
      // Test if service is configured
      if (whatsappService.default.accessToken && whatsappService.default.phoneNumberId) {
        console.log('✅ WhatsApp service is properly configured')
      } else {
        console.log('⚠️ WhatsApp service needs credentials')
      }
    } catch (error) {
      console.log('❌ WhatsApp service import failed:', error.message)
    }
    
    // Test order model
    console.log('\n📦 Order Model:')
    try {
      const Order = await import('./models/order.js')
      console.log('✅ Order model imported successfully')
      
      // Check if whatsappMessages field exists
      const orderSchema = Order.default.schema
      if (orderSchema.paths.whatsappMessages) {
        console.log('✅ WhatsApp messages field exists in Order schema')
      } else {
        console.log('❌ WhatsApp messages field missing from Order schema')
      }
    } catch (error) {
      console.log('❌ Order model import failed:', error.message)
    }
    
    console.log('\n🎯 Next Steps:')
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.log('1. Add your WhatsApp credentials to .env file')
      console.log('2. Get credentials from Meta Business Manager')
    } else {
      console.log('1. Test webhook verification in Meta Business Manager')
      console.log('2. Create message template for fulfillment choice')
      console.log('3. Test with a real order')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from database')
  }
}

testWhatsAppSetup()
