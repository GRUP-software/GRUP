# 🐳 Docker Production Deployment Guide

## 📋 Overview

This guide explains how to deploy your Grup application using Docker in production with MongoDB, Redis, and Nginx.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (SSL)   │    │   Grup App      │    │   MongoDB       │
│   Port 80/443   │◄──►│   Port 8080     │◄──►│   Port 27017    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Redis         │
                       │   Port 6379     │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM available
- Ports 80, 443, 8080 available

### Step 1: Environment Setup

```bash
# Copy production environment template
cp production.env.template .env.production

# Edit with your production values
nano .env.production

# Set environment variables
export $(cat .env.production | xargs)
```

### Step 2: Deploy with Docker

```bash
# Make deployment script executable
chmod +x scripts/deploy-docker.sh

# Run deployment
./scripts/deploy-docker.sh
```

### Step 3: Verify Deployment

```bash
# Check container status
docker-compose ps

# Test application
curl http://localhost:8080/health

# View logs
docker-compose logs -f
```

## 🔧 Configuration

### Environment Variables

Create `.env.production` with these settings:

```env
# Environment
NODE_ENV=production

# Server
PORT=8080

# Database (Docker MongoDB)
MONGODB_URI=mongodb://admin:password@mongo:27017/grup-production?authSource=admin

# MongoDB Root Credentials (for Docker setup)
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password

# JWT
JWT_SECRET=your-super-secure-production-jwt-secret

# Frontend URL
FRONTEND_URL=https://your-domain.com
SOCKET_CORS_ORIGIN=https://your-domain.com

# Payment (Paystack Production Keys)
PAYSTACK_SECRET_KEY=sk_live_your_production_key
PAYSTACK_PUBLIC_KEY=pk_live_your_production_key

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASS=your-production-app-password

# Admin
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=your-secure-admin-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=dafkhnw7p
CLOUDINARY_API_KEY=946915641663984
CLOUDINARY_API_SECRET=MU6_2U6tpzbJ-VbnqfQ-_OEQeWc
CLOUDINARY_FOLDER=grup

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your-production-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-production-phone-id
WHATSAPP_VERIFY_TOKEN=your-production-verify-token
ADMIN_USER_ID=your-admin-user-id

# Logging
LOG_LEVEL=error

# Session
SESSION_SECRET=your-production-session-secret
```

### Docker Compose Services

#### MongoDB
- **Image:** `mongo:7.0`
- **Port:** `27017`
- **Data:** Persistent volume `mongo_data`
- **Authentication:** Root user with password
- **Health Check:** MongoDB ping command

#### Redis
- **Image:** `redis:7-alpine`
- **Port:** `6379`
- **Data:** Persistent volume `redis_data`
- **Health Check:** Redis ping command

#### Application
- **Build:** Local Dockerfile
- **Port:** `8080`
- **Dependencies:** MongoDB and Redis
- **Health Check:** Application health endpoint

#### Nginx
- **Image:** `nginx:alpine`
- **Ports:** `80` (HTTP), `443` (HTTPS)
- **SSL:** Self-signed certificate (replace with real cert)
- **Rate Limiting:** API endpoints
- **Gzip Compression:** Enabled

## 🔒 Security Configuration

### SSL/TLS Setup

1. **Replace Self-Signed Certificate:**
   ```bash
   # Place your SSL certificates in nginx/ssl/
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

2. **Update Nginx Configuration:**
   Edit `nginx/nginx.conf` with your domain name.

### MongoDB Security

1. **Change Default Credentials:**
   ```bash
   # Update in .env.production
   MONGO_ROOT_USERNAME=your-secure-username
   MONGO_ROOT_PASSWORD=your-secure-password
   ```

2. **Network Security:**
   - MongoDB only accessible within Docker network
   - No external MongoDB port exposure in production

### Application Security

- **Rate Limiting:** 10 requests/second for API
- **Security Headers:** HSTS, XSS Protection, etc.
- **CORS:** Configured for production domains
- **File Upload Limits:** 10MB maximum

## 📊 Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:8080/health

# Database health
docker-compose exec app npm run db:test

# Container health
docker-compose ps
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f mongo
docker-compose logs -f nginx

# Application logs
docker-compose exec app tail -f logs/app.log
```

### Metrics

```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Volume usage
docker volume ls
```

## 🔄 Maintenance

### Updates

```bash
# Update application
git pull
docker-compose up -d --build

# Update dependencies
docker-compose exec app npm update
docker-compose up -d --build
```

### Backups

```bash
# MongoDB backup
docker-compose exec mongo mongodump --out /data/backup/$(date +%Y%m%d)

# Copy backup from container
docker cp grup-mongo:/data/backup ./backups/

# Redis backup (if needed)
docker-compose exec redis redis-cli BGSAVE
```

### Scaling

```bash
# Scale application (if using Docker Swarm)
docker service scale grup_app=3

# Or manually add more containers
docker-compose up -d --scale app=3
```

## 🚨 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs app

# Check resource usage
docker stats

# Restart services
docker-compose restart
```

#### Database Connection Issues
```bash
# Check MongoDB status
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Check network connectivity
docker-compose exec app ping mongo

# Recreate containers
docker-compose down
docker-compose up -d
```

#### SSL Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/cert.pem -text -noout

# Test SSL connection
curl -k https://localhost

# Regenerate self-signed cert
./scripts/deploy-docker.sh
```

### Performance Issues

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Optimize Node.js memory
# Add to Dockerfile:
ENV NODE_OPTIONS="--max-old-space-size=512"
```

#### Slow Database Queries
```bash
# Check indexes
docker-compose exec app npm run db:indexes

# Monitor queries
docker-compose exec mongo mongosh --eval "db.currentOp()"
```

## 📋 Production Checklist

### Before Going Live
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Firewall rules set
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security scan passed

### Regular Maintenance
- [ ] Update dependencies monthly
- [ ] Review logs weekly
- [ ] Test backups monthly
- [ ] Monitor resource usage
- [ ] Update SSL certificates
- [ ] Security patches

## 🔗 Useful Commands

### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Run tests
docker-compose exec app npm test

# Access database
docker-compose exec mongo mongosh
```

### Production
```bash
# Deploy
./scripts/deploy-docker.sh

# Monitor
docker-compose logs -f

# Backup
docker-compose exec mongo mongodump --out /data/backup/$(date +%Y%m%d)

# Update
docker-compose up -d --build
```

### Emergency
```bash
# Stop all services
docker-compose down

# Restart specific service
docker-compose restart app

# View resource usage
docker stats

# Clean up
docker system prune -a
```

---

## 🎉 Summary

Your Docker deployment includes:
- ✅ **MongoDB** with authentication and persistence
- ✅ **Redis** for caching and sessions
- ✅ **Nginx** with SSL and rate limiting
- ✅ **Application** with health checks
- ✅ **Automatic** database initialization
- ✅ **Production-ready** security configuration
- ✅ **Monitoring** and logging setup
- ✅ **Backup** and maintenance scripts

**Your application is now ready for production deployment!**

