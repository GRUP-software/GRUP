#!/bin/bash

echo "🐳 Grup Docker Production Deployment Script"
echo "==========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

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

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads logs nginx/ssl

# Generate self-signed SSL certificate for development (replace with real certs in production)
if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
    echo "🔐 Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=NG/ST=Lagos/L=Lagos/O=Grup/CN=localhost"
    echo "✅ SSL certificate generated"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images (optional)
read -p "Remove old Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing old images..."
    docker-compose down --rmi all
fi

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check container status
echo "🔍 Checking container status..."
docker-compose ps

# Test database connection
echo "🗄️  Testing database connection..."
docker-compose exec app npm run db:test

if [ $? -ne 0 ]; then
    echo "❌ Database connection test failed"
    echo "📋 Container logs:"
    docker-compose logs mongo
    docker-compose logs app
    exit 1
fi

# Create database indexes
echo "📊 Creating database indexes..."
docker-compose exec app npm run db:indexes

if [ $? -ne 0 ]; then
    echo "❌ Failed to create database indexes"
    exit 1
fi

# Test application health
echo "🏥 Testing application health..."
for i in {1..10}; do
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Application is healthy"
        break
    else
        echo "⏳ Waiting for application to be ready... (attempt $i/10)"
        sleep 10
    fi
done

if [ $i -eq 10 ]; then
    echo "❌ Application health check failed"
    echo "📋 Application logs:"
    docker-compose logs app
    exit 1
fi

# Test API endpoints
echo "🔗 Testing API endpoints..."
curl -f http://localhost:8080/api/status > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API status endpoint working"
else
    echo "⚠️  API status endpoint not responding"
fi

# Show final status
echo ""
echo "🎉 Docker deployment completed successfully!"
echo ""
echo "📊 Container Status:"
docker-compose ps
echo ""
echo "🔗 Access URLs:"
echo "   - Application: http://localhost:8080"
echo "   - Admin Panel: http://localhost:8080/admin"
echo "   - Health Check: http://localhost:8080/health"
echo "   - API Status: http://localhost:8080/api/status"
echo ""
echo "📋 Useful Commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo "   - Update application: docker-compose up -d --build"
echo ""
echo "⚠️  Important Notes:"
echo "   - Replace self-signed SSL certificate with real certificate"
echo "   - Set up proper domain and DNS"
echo "   - Configure firewall rules"
echo "   - Set up monitoring and backups"
echo "   - Update environment variables for production"
echo ""
echo "🔒 Security Checklist:"
echo "   - [ ] Change default MongoDB credentials"
echo "   - [ ] Use real SSL certificates"
echo "   - [ ] Configure firewall"
echo "   - [ ] Set up monitoring"
echo "   - [ ] Configure backups"

