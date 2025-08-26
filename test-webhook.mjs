import dotenv from 'dotenv'
import axios from 'axios'

// Load environment variables
dotenv.config()

async function testWebhook() {
  try {
    console.log('🔍 Testing webhook endpoint...')
    console.log('Environment variables:')
    console.log('WHATSAPP_VERIFY_TOKEN:', process.env.WHATSAPP_VERIFY_TOKEN)
    console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not set')
    
    // Test the webhook verification endpoint
    const response = await axios.get('http://localhost:5000/api/webhook/whatsapp', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN || 'grup_whatsapp_verify_2024',
        'hub.challenge': 'test123'
      }
    })
    
    console.log('✅ Webhook test successful!')
    console.log('Response:', response.data)
    
  } catch (error) {
    console.error('❌ Webhook test failed:')
    console.error('Status:', error.response?.status)
    console.error('Data:', error.response?.data)
    console.error('Message:', error.message)
  }
}

testWebhook()
