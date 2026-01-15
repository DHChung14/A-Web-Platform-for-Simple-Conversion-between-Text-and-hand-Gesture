#!/bin/bash

# ==================== VSL Platform - AWS Free Tier Deployment Script ====================
# Script tự động hóa deploy lên EC2 t2.micro (Free Tier)
# ========================================================================================

set -e  # Exit on error

echo "🚀 VSL Platform - AWS Free Tier Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on EC2
if [ ! -f /sys/hypervisor/uuid ] && [ ! -d /sys/class/dmi/id ]; then
    echo -e "${YELLOW}⚠️  Warning: This script is designed to run on EC2 instance${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Please do not run as root. Use ec2-user or your user.${NC}"
    exit 1
fi

# Variables (có thể override bằng environment variables)
RDS_ENDPOINT=${RDS_ENDPOINT:-""}
RDS_PASSWORD=${RDS_PASSWORD:-""}
JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}

echo ""
echo "📋 Configuration:"
echo "  RDS_ENDPOINT: ${RDS_ENDPOINT:-'NOT SET'}"
echo "  JWT_SECRET: ${JWT_SECRET:0:20}..."
echo ""

# Check required variables
if [ -z "$RDS_ENDPOINT" ]; then
    echo -e "${RED}❌ RDS_ENDPOINT is required!${NC}"
    echo "   Set it: export RDS_ENDPOINT=your-rds-endpoint.region.rds.amazonaws.com"
    exit 1
fi

if [ -z "$RDS_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  RDS_PASSWORD not set. You'll need to set it manually in docker-compose.free-tier.yml${NC}"
fi

# Step 1: Install Docker
echo ""
echo -e "${GREEN}Step 1: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    sudo yum update -y
    sudo yum install docker -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Step 2: Install Docker Compose
echo ""
echo -e "${GREEN}Step 2: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Step 3: Install Nginx
echo ""
echo -e "${GREEN}Step 3: Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo yum install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}✅ Nginx installed${NC}"
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi

# Step 4: Setup Nginx config
echo ""
echo -e "${GREEN}Step 4: Setting up Nginx reverse proxy...${NC}"
NGINX_CONFIG="/etc/nginx/conf.d/vsl-platform.conf"
sudo tee $NGINX_CONFIG > /dev/null <<EOF
# HTTP → HTTPS redirect (tạm thời comment, setup SSL sau)
# server {
#     listen 80;
#     server_name _;
#     return 301 https://\$host\$request_uri;
# }

# HTTP (tạm thời, sẽ chuyển sang HTTPS sau khi có SSL)
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # AI Service (nếu cần expose)
    location /ai {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx
echo -e "${GREEN}✅ Nginx configured${NC}"

# Step 5: Update docker-compose.free-tier.yml
echo ""
echo -e "${GREEN}Step 5: Updating docker-compose configuration...${NC}"

if [ ! -f "vsl-platform-backend/docker-compose.free-tier.yml" ]; then
    echo -e "${RED}❌ docker-compose.free-tier.yml not found!${NC}"
    exit 1
fi

# Replace placeholders
cd vsl-platform-backend

# Get EC2 public IP
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Update docker-compose.free-tier.yml
sed -i "s|<RDS_ENDPOINT>|$RDS_ENDPOINT|g" docker-compose.free-tier.yml
if [ ! -z "$RDS_PASSWORD" ]; then
    sed -i "s|<RDS_PASSWORD>|$RDS_PASSWORD|g" docker-compose.free-tier.yml
fi
sed -i "s|<JWT_SECRET>|$JWT_SECRET|g" docker-compose.free-tier.yml
sed -i "s|http://localhost:8080/api|http://$EC2_PUBLIC_IP:8080/api|g" docker-compose.free-tier.yml

echo -e "${GREEN}✅ Configuration updated${NC}"

# Step 6: Build and start containers
echo ""
echo -e "${GREEN}Step 6: Building Docker images...${NC}"
docker-compose -f docker-compose.free-tier.yml build

echo ""
echo -e "${GREEN}Step 7: Starting containers...${NC}"
docker-compose -f docker-compose.free-tier.yml up -d

# Step 7: Wait for services
echo ""
echo -e "${GREEN}Step 8: Waiting for services to be healthy...${NC}"
sleep 10

# Check containers
echo ""
echo -e "${GREEN}📊 Container Status:${NC}"
docker-compose -f docker-compose.free-tier.yml ps

# Check resources
echo ""
echo -e "${GREEN}📊 Resource Usage:${NC}"
docker stats --no-stream

# Final info
echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://$EC2_PUBLIC_IP"
echo "   Backend API: http://$EC2_PUBLIC_IP:8080/api"
echo "   AI Service: http://$EC2_PUBLIC_IP:5000"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.free-tier.yml logs -f"
echo "   Stop: docker-compose -f docker-compose.free-tier.yml down"
echo "   Restart: docker-compose -f docker-compose.free-tier.yml restart"
echo "   Check resources: docker stats"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "   1. Update Security Groups to allow traffic"
echo "   2. Setup SSL certificate (Let's Encrypt) for HTTPS"
echo "   3. Monitor costs in AWS Billing Dashboard"
echo ""

