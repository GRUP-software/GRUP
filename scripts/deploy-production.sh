#!/bin/bash

echo "🚀 Grup Production Deployment Script"
echo "====================================="

# Check if running in production environment
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    echo "   Current NODE_ENV: $NODE_ENV"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check required environment variables
echo "🔍 Checking environment variables..."

REQUIRED_VARS=(
    "MONGODB_URI"
    "JWT_SECRET"
    "PAYSTACK_SECRET_KEY"
    "PAYSTACK_PUBLIC_KEY"
    "EMAIL_USER"
    "EMAIL_PASS"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please set these variables before deploying to production."
    exit 1
fi

echo "✅ All required environment variables are set"

# Check database connection
echo "🔍 Testing database connection..."
node -e "
const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!mongoUri) {
    console.error('❌ No database URI found');
    process.exit(1);
}

mongoose.connect(mongoUri, {
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    ssl: true,
    sslValidate: true,
    retryWrites: true,
    w: 'majority'
})
.then(() => {
    console.log('✅ Database connection successful');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Database:', mongoose.connection.name);
    process.exit(0);
})
.catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
});
"

if [ $? -ne 0 ]; then
    echo "❌ Database connection test failed"
    exit 1
fi

# Install production dependencies
echo "📦 Installing production dependencies..."
npm ci --only=production

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create database indexes
echo "🗄️  Creating database indexes..."
node -e "
const { connectDatabase, createIndexes } = require('./config/database.js');
(async () => {
    try {
        await connectDatabase();
        await createIndexes();
        console.log('✅ Database indexes created successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create indexes:', error.message);
        process.exit(1);
    }
})();
"

if [ $? -ne 0 ]; then
    echo "❌ Failed to create database indexes"
    exit 1
fi

# Test application startup
echo "🧪 Testing application startup..."
timeout 30s node server.mjs &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Application started successfully"
    kill $SERVER_PID
else
    echo "❌ Application failed to start"
    exit 1
fi

echo ""
echo "🎉 Production deployment checks completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start your application: npm start"
echo "2. Monitor logs for any issues"
echo "3. Test all critical endpoints"
echo "4. Set up monitoring and alerting"
echo ""
echo "🔗 Useful endpoints:"
echo "   - Health check: http://localhost:$PORT/health"
echo "   - API status: http://localhost:$PORT/api/status"
echo "   - Admin panel: http://localhost:$PORT/admin"
echo ""
echo "⚠️  Remember to:"
echo "   - Set up SSL/TLS certificates"
echo "   - Configure reverse proxy (nginx/apache)"
echo "   - Set up monitoring (Sentry, etc.)"
echo "   - Configure backups"
echo "   - Set up CI/CD pipeline"

