#!/bin/bash

# ==================== Step-by-Step Deployment Guide ====================
# Script hướng dẫn deploy từng bước với user interaction
# =======================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EC2_IP="52.220.1.69"
RDS_ENDPOINT="vsl-platform-db.cjaqs60io7ay.ap-southeast-1.rds.amazonaws.com"
DOMAIN="canhnq.online"

echo -e "${BLUE}🚀 VSL Platform - Step-by-Step Deployment${NC}"
echo "=========================================="
echo ""
echo "EC2 IP: $EC2_IP"
echo "Domain: $DOMAIN"
echo "RDS Endpoint: $RDS_ENDPOINT"
echo ""

# Step 1: Check SSH
echo -e "${GREEN}Step 1: Checking SSH connection...${NC}"
if ssh -i ~/.ssh/vsl-platform-key -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo 'OK'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    echo "Please check EC2 instance status first"
    exit 1
fi

# Step 2: Get RDS password
echo ""
echo -e "${GREEN}Step 2: RDS Configuration${NC}"
read -sp "Enter RDS password: " RDS_PASSWORD
echo ""

# Step 3: Get email for SSL
echo ""
echo -e "${GREEN}Step 3: SSL Certificate${NC}"
read -p "Enter email for Let's Encrypt SSL certificate: " EMAIL

# Step 4: Get Git repository URL
echo ""
echo -e "${GREEN}Step 4: Git Repository${NC}"
read -p "Enter Git repository URL (or press Enter to skip and clone manually): " GIT_REPO_URL

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  EC2 IP: $EC2_IP"
echo "  Domain: $DOMAIN"
echo "  RDS Endpoint: $RDS_ENDPOINT"
echo "  Email: $EMAIL"
echo "  Git Repo: ${GIT_REPO_URL:-'Will clone manually'}"
echo ""

read -p "Continue with deployment? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Step 5: Deploy
echo ""
echo -e "${GREEN}Step 5: Starting deployment...${NC}"
echo ""

# Export variables for deploy-full.sh
export RDS_ENDPOINT
export RDS_PASSWORD
export JWT_SECRET
export DOMAIN
export EMAIL
export GIT_REPO_URL

# Run deploy-full.sh
cd "$(dirname "$0")"
./deploy-full.sh <<EOF
$SSH_KEY
$RDS_PASSWORD
$EMAIL
$GIT_REPO_URL
EOF

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   Frontend: https://$DOMAIN"
echo "   Backend API: https://api.$DOMAIN/api"
echo ""
echo "⏳ Note: If SSL certificate setup failed, wait 15-60 minutes for DNS propagation and run:"
echo "   ssh -i ~/.ssh/vsl-platform-key ec2-user@$EC2_IP"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN"
