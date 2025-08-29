import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

const setupDatabaseConnection = () => {
  console.log('🔧 MongoDB Connection Setup\n');
  
  console.log('📋 Choose your MongoDB setup:');
  console.log('1. Local MongoDB (no authentication)');
  console.log('2. Local MongoDB (with authentication)');
  console.log('3. MongoDB Atlas (cloud)');
  console.log('4. Custom connection string');
  
  // For now, let's create a basic .env template
  const envTemplate = `# Database Configuration
# Choose one of the following options:

# Option 1: Local MongoDB (no auth)
MONGODB_URI=mongodb://localhost:27017/GRUP

# Option 2: Local MongoDB (with auth) - uncomment and update
# MONGODB_URI=mongodb://username:password@localhost:27017/GRUP

# Option 3: MongoDB Atlas - uncomment and update
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/GRUP?retryWrites=true&w=majority

# Option 4: Custom connection string - uncomment and update
# MONGODB_URI=your_custom_connection_string_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Session Configuration
SESSION_SECRET=your-session-secret-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Other configurations...
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
`;

  try {
    // Check if .env file exists
    if (fs.existsSync(envPath)) {
      console.log('⚠️  .env file already exists!');
      console.log('   Current .env file location:', envPath);
      console.log('\n📝 To update your MongoDB connection:');
      console.log('   1. Open the .env file');
      console.log('   2. Update the MONGODB_URI line with your connection string');
      console.log('   3. Save the file');
      console.log('\n🔗 Common connection string formats:');
      console.log('   - Local (no auth): mongodb://localhost:27017/GRUP');
      console.log('   - Local (with auth): mongodb://username:password@localhost:27017/GRUP');
      console.log('   - Atlas: mongodb+srv://username:password@cluster.mongodb.net/GRUP?retryWrites=true&w=majority');
    } else {
      // Create .env file with template
      fs.writeFileSync(envPath, envTemplate);
      console.log('✅ Created .env file with database connection template');
      console.log('📁 File location:', envPath);
      console.log('\n📝 Next steps:');
      console.log('   1. Open the .env file');
      console.log('   2. Uncomment and update the MONGODB_URI line for your setup');
      console.log('   3. Save the file');
      console.log('   4. Run: npm run db:check-indexes');
    }
    
    console.log('\n🔍 Quick MongoDB Setup Guide:');
    console.log('\n📦 Local MongoDB Installation:');
    console.log('   1. Download MongoDB Community Server from mongodb.com');
    console.log('   2. Install and start the MongoDB service');
    console.log('   3. Use: MONGODB_URI=mongodb://localhost:27017/GRUP');
    
    console.log('\n☁️  MongoDB Atlas Setup:');
    console.log('   1. Go to mongodb.com/atlas');
    console.log('   2. Create a free cluster');
    console.log('   3. Create a database user');
    console.log('   4. Get your connection string');
    console.log('   5. Use: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/GRUP');
    
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
};

setupDatabaseConnection();
