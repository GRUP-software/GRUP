import dotenv from 'dotenv'
import mongoose from 'mongoose'
import whatsappService from './services/whatsappService.js'
import { validateWhatsAppConfig } from './config/whatsapp.js'
import logger from './utils/logger.js'

// Load environment variables
dotenv.config()

// Test configuration
const testConfig = {
  phoneNumber: '+15551534048', // Your test phone number from Meta Business
  trackingNumber: 'TEST123456',
  orderDetails: {
    totalAmount: 15000,
    itemCount: 2,
    items: 'Test Product 1, Test Product 2'
  }
}

async function testWhatsAppIntegration() {
  try {
    console.log('🧪 Testing WhatsApp Integration...\n')

    // 1. Validate configuration
    console.log('1. Validating WhatsApp configuration...')
    const configValid = validateWhatsAppConfig()
    if (!configValid) {
      console.log('❌ WhatsApp configuration is invalid. Please check your environment variables.')
      console.log('Required variables:')
      console.log('- WHATSAPP_ACCESS_TOKEN')
      console.log('- WHATSAPP_PHONE_NUMBER_ID')
      console.log('- WHATSAPP_VERIFY_TOKEN')
      return
    }
    console.log('✅ Configuration is valid\n')

    // 2. Test sending fulfillment choice message
    console.log('2. Testing fulfillment choice message...')
    const messageResult = await whatsappService.sendFulfillmentChoiceMessage(
      testConfig.phoneNumber,
      testConfig.trackingNumber,
      testConfig.orderDetails
    )

    if (messageResult.success) {
      console.log('✅ Message sent successfully')
      console.log(`   Message ID: ${messageResult.messageId}`)
      console.log(`   Tracking Number: ${messageResult.trackingNumber}`)
    } else {
      console.log('❌ Failed to send message')
      console.log(`   Error: ${messageResult.error}`)
    }
    console.log()

    // 3. Test webhook processing (simulate button response)
    console.log('3. Testing webhook processing...')
    const mockWebhookData = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: testConfig.phoneNumber,
              type: 'interactive',
              interactive: {
                type: 'button_reply',
                button_reply: {
                  id: `pickup_${testConfig.trackingNumber}`,
                  title: '🏪 Pickup'
                }
              }
            }]
          }
        }]
      }]
    }

    const webhookResult = await whatsappService.processWebhook(mockWebhookData)
    console.log('Webhook processing result:', webhookResult)
    console.log()

    // 4. Test confirmation message
    console.log('4. Testing confirmation message...')
    const confirmationResult = await whatsappService.sendConfirmationMessage(
      testConfig.phoneNumber,
      testConfig.trackingNumber,
      'pickup',
      'Test Location'
    )

    if (confirmationResult.success) {
      console.log('✅ Confirmation message sent successfully')
    } else {
      console.log('❌ Failed to send confirmation message')
      console.log(`   Error: ${confirmationResult.error}`)
    }
    console.log()

    // 5. Test help message
    console.log('5. Testing help message...')
    await whatsappService.sendHelpMessage(testConfig.phoneNumber, testConfig.trackingNumber)
    console.log('✅ Help message sent\n')

    console.log('🎉 WhatsApp integration test completed!')
    console.log('\nNext steps:')
    console.log('1. Set up your WhatsApp Business API webhook URL')
    console.log('2. Configure your environment variables')
    console.log('3. Test with real phone numbers')
    console.log('4. Monitor webhook responses')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Test webhook signature verification
function testWebhookSignature() {
  console.log('\n🔐 Testing webhook signature verification...')
  
  const testBody = { test: 'data' }
  const testSignature = 'test-signature'
  
  const isValid = whatsappService.verifyWebhookSignature(testBody, testSignature)
  console.log(`Signature verification result: ${isValid}`)
}

// Run tests
async function runTests() {
  console.log('🚀 Starting WhatsApp Integration Tests\n')
  
  // Test signature verification
  testWebhookSignature()
  
  // Test full integration
  await testWhatsAppIntegration()
  
  console.log('\n✨ All tests completed!')
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}

export { testWhatsAppIntegration, testWebhookSignature }

