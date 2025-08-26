import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

async function testImport() {
  try {
    console.log('🔍 Testing imports...')
    
    // Test basic imports
    console.log('Testing logger import...')
    const logger = await import('./utils/logger.js')
    console.log('✅ Logger imported successfully')
    
    console.log('Testing whatsappService import...')
    const whatsappService = await import('./services/whatsappService.js')
    console.log('✅ WhatsApp service imported successfully')
    
    console.log('Testing whatsappController import...')
    const whatsappController = await import('./controllers/whatsappController.js')
    console.log('✅ WhatsApp controller imported successfully')
    
    console.log('✅ All imports successful!')
    
  } catch (error) {
    console.error('❌ Import failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

testImport()
