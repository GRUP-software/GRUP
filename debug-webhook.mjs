import dotenv from 'dotenv'
import axios from 'axios'

// Load environment variables
dotenv.config()

async function debugWebhook() {
  try {
    console.log('🔍 Debugging webhook endpoint...')
    console.log('Environment variables:')
    console.log('WHATSAPP_VERIFY_TOKEN:', process.env.WHATSAPP_VERIFY_TOKEN)
    
    // Test with different parameters
    const testCases = [
      {
        name: 'Valid verification request',
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN,
          'hub.challenge': 'test123'
        }
      },
      {
        name: 'Missing mode',
        params: {
          'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN,
          'hub.challenge': 'test123'
        }
      },
      {
        name: 'Invalid token',
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'test123'
        }
      }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`)
      try {
        const response = await axios.get('http://localhost:5000/api/webhook/whatsapp', {
          params: testCase.params,
          timeout: 5000
        })
        console.log('✅ Success:', response.status, response.data)
      } catch (error) {
        console.log('❌ Error:', error.response?.status, error.response?.data || error.message)
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  }
}

debugWebhook()
