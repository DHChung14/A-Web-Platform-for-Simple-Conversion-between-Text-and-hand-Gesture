#!/bin/bash

# ==================== Deploy Application Script ====================
# Script tự động deploy app lên EC2 sau khi infrastructure ready
# ====================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 VSL Platform - Application Deployment${NC}"
echo "=========================================="

# Check if running on EC2
if [ ! -f /sys/hypervisor/uuid ] && [ ! -d /sys/class/dmi/id ]; then
    echo -e "${YELLOW}⚠️  Warning: This script is designed to run on EC2 instance${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Get RDS endpoint from Terraform (if available)
if command -v terraform &> /dev/null && [ -f "../terraform-outputs.txt" ]; then
    RDS_ENDPOINT=$(grep "rds_address" ../terraform-outputs.txt | awk '{print $3}' | tr -d '"' || echo "")
fi

# Prompt for RDS endpoint if not found
if [ -z "$RDS_ENDPOINT" ]; then
    echo -e "${YELLOW}⚠️  RDS endpoint not found${NC}"
    read -p "Enter RDS endpoint (e.g., vsl-platform-db.xxxxx.rds.amazonaws.com): " RDS_ENDPOINT
fi

# Prompt for RDS password
read -sp "Enter RDS password: " RDS_PASSWORD
echo ""

# Generate JWT secret if not set
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    echo -e "${GREEN}✅ Generated JWT secret${NC}"
fi

# Set environment variables
export RDS_ENDPOINT
export RDS_PASSWORD
export JWT_SECRET

echo ""
echo -e "${GREEN}📋 Configuration:${NC}"
echo "  RDS Endpoint: $RDS_ENDPOINT"
echo "  JWT Secret: ${JWT_SECRET:0:20}..."

# Step 1: Test RDS connection
echo ""
echo -e "${GREEN}Step 1: Testing RDS connection...${NC}"

if command -v psql &> /dev/null; then
    PGPASSWORD=$RDS_PASSWORD psql -h $RDS_ENDPOINT -U postgres -d vsl_db -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ RDS connection successful${NC}"
    else
        echo -e "${RED}❌ RDS connection failed${NC}"
        echo "Please check:"
        echo "  1. RDS endpoint is correct"
        echo "  2. RDS password is correct"
        echo "  3. Security Group allows connection from EC2"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql not installed, skipping connection test${NC}"
fi

# Step 2: Update docker-compose
echo ""
echo -e "${GREEN}Step 2: Updating docker-compose configuration...${NC}"

if [ ! -f "docker-compose.free-tier-optimized.yml" ]; then
    echo -e "${RED}❌ docker-compose.free-tier-optimized.yml not found!${NC}"
    exit 1
fi

# Backup original
cp docker-compose.free-tier-optimized.yml docker-compose.free-tier-optimized.yml.bak

# Replace placeholders
sed -i "s|<RDS_ENDPOINT>|$RDS_ENDPOINT|g" docker-compose.free-tier-optimized.yml
sed -i "s|<RDS_PASSWORD>|$RDS_PASSWORD|g" docker-compose.free-tier-optimized.yml
sed -i "s|<JWT_SECRET>|$JWT_SECRET|g" docker-compose.free-tier-optimized.yml

echo -e "${GREEN}✅ Configuration updated${NC}"

# Step 3: Build and start containers
echo ""
echo -e "${GREEN}Step 3: Building Docker images...${NC}"
docker-compose -f docker-compose.free-tier-optimized.yml build

echo ""
echo -e "${GREEN}Step 4: Starting containers...${NC}"
docker-compose -f docker-compose.free-tier-optimized.yml up -d

# Step 5: Wait for services
echo ""
echo -e "${GREEN}Step 5: Waiting for services to be healthy...${NC}"
sleep 15

# Step 6: Check status
echo ""
echo -e "${GREEN}📊 Container Status:${NC}"
docker-compose -f docker-compose.free-tier-optimized.yml ps

echo ""
echo -e "${GREEN}📊 Resource Usage:${NC}"
docker stats --no-stream

# Step 7: Test services
echo ""
echo -e "${GREEN}Step 6: Testing services...${NC}"

# Test Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not responding yet (may need more time)${NC}"
fi

# Test Backend
if curl -f http://localhost:8080/api/dictionary/count > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Backend not responding yet (may need more time)${NC}"
fi

# Test AI Service
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ AI Service is running${NC}"
else
    echo -e "${YELLOW}⚠️  AI Service not responding yet (may need more time)${NC}"
fi

# Final info
echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8080/api"
echo "   AI Service: http://localhost:5000"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.free-tier-optimized.yml logs -f"
echo "   Stop: docker-compose -f docker-compose.free-tier-optimized.yml down"
echo "   Restart: docker-compose -f docker-compose.free-tier-optimized.yml restart"
echo "   Check resources: docker stats"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "   1. Setup Nginx reverse proxy (see DEPLOYMENT_GUIDE.md)"
echo "   2. Setup SSL certificate with Let's Encrypt"
echo "   3. Test application from browser"
echo ""

