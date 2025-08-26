#!/usr/bin/env node

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

console.log('🚀 WhatsApp Integration Setup\n')

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env')
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found. Please create one first.')
  process.exit(1)
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8')

// WhatsApp configuration template
const whatsappConfig = `
# WhatsApp Business API Configuration
# Get these from Meta Business Manager: https://business.facebook.com/
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
ADMIN_USER_ID=admin_user_id_for_notifications
`

// Check if WhatsApp config already exists
if (envContent.includes('WHATSAPP_ACCESS_TOKEN')) {
  console.log('✅ WhatsApp configuration already exists in .env file')
} else {
  // Add WhatsApp configuration to .env
  envContent += whatsappConfig
  fs.writeFileSync(envPath, envContent)
  console.log('✅ Added WhatsApp configuration to .env file')
}

console.log('\n📋 Setup Instructions:')
console.log('1. Go to Meta Business Manager: https://business.facebook.com/')
console.log('2. Create a business account if you don\'t have one')
console.log('3. Set up WhatsApp Business API')
console.log('4. Get your API credentials:')
console.log('   - Access Token')
console.log('   - Phone Number ID')
console.log('5. Update your .env file with the real values')
console.log('6. Configure webhook URL: https://yourdomain.com/api/webhook/whatsapp')
console.log('7. Set verify token in Meta Business Manager')
console.log('8. Create message templates for fulfillment choice')

console.log('\n🔧 Next Steps:')
console.log('1. Update .env file with real credentials')
console.log('2. Run: node test-whatsapp-integration.mjs')
console.log('3. Test with a real phone number')
console.log('4. Monitor webhook responses')

console.log('\n📚 Documentation:')
console.log('- See WHATSAPP_INTEGRATION.md for detailed setup instructions')
console.log('- Check Meta Business API documentation for troubleshooting')

console.log('\n✨ Setup complete!')

