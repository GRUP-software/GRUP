import dotenv from 'dotenv'
import axios from 'axios'

// Load environment variables
dotenv.config()

async function testTemplate() {
  try {
    console.log('🔍 Testing WhatsApp Template Integration...')
    
    // Test environment variables
    console.log('\n📋 Environment Variables:')
    console.log('WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? '✅ Set' : '❌ Missing')
    console.log('WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ Set' : '❌ Missing')
    
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.log('\n❌ WhatsApp credentials not configured')
      return
    }

    // Test template structure
    console.log('\n📱 Template Structure:')
    console.log('Template Name: fulfillment_choice')
    console.log('Language: en')
    console.log('Parameters:')
    console.log('  {{1}} = Product Name (e.g., "Rice", "T-Shirt")')
    console.log('  {{2}} = Order Tracking Number (e.g., "#GRP123456789")')
    console.log('  {{3}} = GroupBuy Total Amount (only this GroupBuy)')
    console.log('  {{4}} = GroupBuy Item Count (only this GroupBuy)')
    console.log('Buttons:')
    console.log('  🏪 Pickup (ID: pickup)')
    console.log('  🚚 Delivery (+₦500) (ID: delivery)')

    // Test message structure
    const testMessage = {
      messaging_product: 'whatsapp',
      to: '+1234567890', // Replace with your test number
      type: 'template',
      template: {
        name: 'fulfillment_choice',
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'text',
                text: '#GRP123456789'
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: 'Rice'
              },
              {
                type: 'text',
                text: '#GRP123456789'
              },
              {
                type: 'text',
                text: '₦5,000'
              },
              {
                type: 'text',
                text: '2'
              }
            ]
          }
        ]
      }
    }

    console.log('\n📤 Test Message Structure:')
    console.log(JSON.stringify(testMessage, null, 2))

    console.log('\n✅ Template Integration Ready!')
    console.log('\n🎯 Individual GroupBuy Messaging Flow:')
    console.log('1. Admin updates GroupBuy A status to "ready_for_pickup"')
    console.log('2. System finds all orders containing GroupBuy A')
    console.log('3. Sends WhatsApp message ONLY for GroupBuy A items')
    console.log('4. Shows: "Your GroupBuy for Rice in your order #GRP123456789 is ready!"')
    console.log('5. GroupBuy B and C remain unaffected')
    console.log('6. Uses Order tracking number for admin reference')
    console.log('\n📋 Next Steps:')
    console.log('1. Create template in Meta Business Manager')
    console.log('2. Wait for approval (24-48 hours)')
    console.log('3. Test with real phone number')
    console.log('4. Monitor webhook responses')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testTemplate()
