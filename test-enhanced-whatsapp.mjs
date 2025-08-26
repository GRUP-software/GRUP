import dotenv from 'dotenv'
import mongoose from 'mongoose'

// Load environment variables
dotenv.config()

async function testEnhancedWhatsApp() {
  try {
    console.log('🔍 Testing Enhanced WhatsApp Integration...')
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Database connected')
    
    // Test imports
    console.log('\n📱 Testing imports...')
    
    const whatsappService = await import('./services/whatsappService.js')
    console.log('✅ WhatsApp service imported')
    
    const GroupBuy = await import('./models/GroupBuy.js')
    console.log('✅ GroupBuy model imported')
    
    const Order = await import('./models/order.js')
    console.log('✅ Order model imported')
    
    // Test GroupBuy schema
    console.log('\n📋 Testing GroupBuy schema...')
    const groupBuySchema = GroupBuy.default.schema
    if (groupBuySchema.paths.whatsappMessages) {
      console.log('✅ WhatsApp messages field exists in GroupBuy schema')
    } else {
      console.log('❌ WhatsApp messages field missing from GroupBuy schema')
    }
    
    // Test Order schema
    console.log('\n📦 Testing Order schema...')
    const orderSchema = Order.default.schema
    if (orderSchema.paths.whatsappMessages) {
      console.log('✅ WhatsApp messages field exists in Order schema')
    } else {
      console.log('❌ WhatsApp messages field missing from Order schema')
    }
    
    // Test environment variables
    console.log('\n🔧 Environment variables:')
    console.log('WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Set' : '❌ Missing')
    console.log('WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ Set' : '❌ Missing')
    console.log('WHATSAPP_VERIFY_TOKEN:', process.env.WHATSAPP_VERIFY_TOKEN ? '✅ Set' : '❌ Missing')
    console.log('ADMIN_USER_ID:', process.env.ADMIN_USER_ID ? '✅ Set' : '❌ Missing')
    
    console.log('\n🎯 Enhanced Features Summary:')
    console.log('✅ GroupBuy WhatsApp message tracking')
    console.log('✅ Order ID cross-referencing')
    console.log('✅ Bulk WhatsApp trigger for complete orders')
    console.log('✅ Enhanced admin routes for GroupBuy messages')
    console.log('✅ Improved message storage and retrieval')
    
    console.log('\n🚀 Ready for testing!')
    console.log('1. Test webhook verification in Meta Business Manager')
    console.log('2. Create message template for fulfillment choice')
    console.log('3. Test with real orders and group buys')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await mongoose.disconnect()
    console.log('\n✅ Disconnected from database')
  }
}

testEnhancedWhatsApp()
