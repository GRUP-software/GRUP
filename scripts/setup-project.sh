#!/bin/bash

echo "🚀 Setting up Zahara Group Buy Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd zahara-frontend-main
npm install
cd ..

# Create uploads folder
echo "📁 Creating uploads folder..."
node scripts/create-uploads-folder.js

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cat > .env << EOL
# Database
MONGO_URI=mongodb://localhost:27017/zahara-group-buy

# JWT
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random

# Server
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:4000

# Payment (Paystack)
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key

# Email (for OTP and notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Admin
ADMIN_EMAIL=admin@zahara.com
ADMIN_PASSWORD=admin123

# Logging
LOG_LEVEL=info

# Session
SESSION_SECRET=your-session-secret-key

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOL
fi

# Create frontend environment file if it doesn't exist
if [ ! -f zahara-frontend-main/.env ]; then
    echo "📝 Creating frontend .env file..."
    cat > zahara-frontend-main/.env << EOL
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Zahara Group Buy
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
EOL
fi

# Make the script executable
chmod +x scripts/setup-project.sh

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env files with your actual values"
echo "2. Start MongoDB: mongod"
echo "3. Run 'npm run dev:full' to start both backend and frontend"
echo "4. Visit http://localhost:4000 for the frontend"
echo "5. Visit http://localhost:5000/admin for the admin panel"
echo ""
echo "🔧 Available commands:"
echo "  npm run dev          - Start backend only"
echo "  npm run dev:frontend - Start frontend only"
echo "  npm run dev:full     - Start both backend and frontend"
echo "  npm run build        - Build frontend for production"
echo "  npm start            - Start production server"
echo "  npm run seed         - Seed database with initial data"
