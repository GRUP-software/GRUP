Write-Host "🐳 Grup Docker Production Deployment Script" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if running in production environment
if ($env:NODE_ENV -ne "production") {
    Write-Host "⚠️  Warning: NODE_ENV is not set to 'production'" -ForegroundColor Yellow
    Write-Host "   Current NODE_ENV: $env:NODE_ENV" -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null
New-Item -ItemType Directory -Force -Path "nginx/ssl" | Out-Null

# Generate self-signed SSL certificate for development
if (-not (Test-Path "nginx/ssl/cert.pem") -or -not (Test-Path "nginx/ssl/key.pem")) {
    Write-Host "🔐 Generating self-signed SSL certificate..." -ForegroundColor Blue
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -subj "/C=NG/ST=Lagos/L=Lagos/O=Grup/CN=localhost"
    Write-Host "✅ SSL certificate generated" -ForegroundColor Green
}

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Blue
docker-compose down

# Remove old images (optional)
$response = Read-Host "Remove old Docker images? (y/N)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "🗑️  Removing old images..." -ForegroundColor Blue
    docker-compose down --rmi all
}

# Build and start containers
Write-Host "🔨 Building and starting containers..." -ForegroundColor Blue
docker-compose up -d --build

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Blue
Start-Sleep -Seconds 30

# Check container status
Write-Host "🔍 Checking container status..." -ForegroundColor Blue
docker-compose ps

# Test database connection
Write-Host "🗄️  Testing database connection..." -ForegroundColor Blue
docker-compose exec app npm run db:test

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database connection test failed" -ForegroundColor Red
    Write-Host "📋 Container logs:" -ForegroundColor Yellow
    docker-compose logs mongo
    docker-compose logs app
    exit 1
}

# Create database indexes
Write-Host "📊 Creating database indexes..." -ForegroundColor Blue
docker-compose exec app npm run db:indexes

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create database indexes" -ForegroundColor Red
    exit 1
}

# Test application health
Write-Host "🏥 Testing application health..." -ForegroundColor Blue
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Application is healthy" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "⏳ Waiting for application to be ready... (attempt $i/10)" -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}

if ($i -eq 11) {
    Write-Host "❌ Application health check failed" -ForegroundColor Red
    Write-Host "📋 Application logs:" -ForegroundColor Yellow
    docker-compose logs app
    exit 1
}

# Test API endpoints
Write-Host "🔗 Testing API endpoints..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/status" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ API status endpoint working" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  API status endpoint not responding" -ForegroundColor Yellow
}

# Show final status
Write-Host ""
Write-Host "🎉 Docker deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Container Status:" -ForegroundColor Blue
docker-compose ps
Write-Host ""
Write-Host "🔗 Access URLs:" -ForegroundColor Blue
Write-Host "   - Application: http://localhost:8080" -ForegroundColor White
Write-Host "   - Admin Panel: http://localhost:8080/admin" -ForegroundColor White
Write-Host "   - Health Check: http://localhost:8080/health" -ForegroundColor White
Write-Host "   - API Status: http://localhost:8080/api/status" -ForegroundColor White
Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Blue
Write-Host "   - View logs: docker-compose logs -f" -ForegroundColor White
Write-Host "   - Stop services: docker-compose down" -ForegroundColor White
Write-Host "   - Restart services: docker-compose restart" -ForegroundColor White
Write-Host "   - Update application: docker-compose up -d --build" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important Notes:" -ForegroundColor Yellow
Write-Host "   - Replace self-signed SSL certificate with real certificate" -ForegroundColor White
Write-Host "   - Set up proper domain and DNS" -ForegroundColor White
Write-Host "   - Configure firewall rules" -ForegroundColor White
Write-Host "   - Set up monitoring and backups" -ForegroundColor White
Write-Host "   - Update environment variables for production" -ForegroundColor White
Write-Host ""
Write-Host "🔒 Security Checklist:" -ForegroundColor Blue
Write-Host "   - [ ] Change default MongoDB credentials" -ForegroundColor White
Write-Host "   - [ ] Use real SSL certificates" -ForegroundColor White
Write-Host "   - [ ] Configure firewall" -ForegroundColor White
Write-Host "   - [ ] Set up monitoring" -ForegroundColor White
Write-Host "   - [ ] Configure backups" -ForegroundColor White
