#!/bin/bash

# ==================== VSL Platform - Full Deployment Script ====================
# Script tự động deploy từ local machine lên EC2
# Bao gồm: SSH vào EC2, clone code, setup Nginx, SSL, và deploy app
# =================================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 VSL Platform - Full Deployment Script${NC}"
echo "=========================================="

# Check if terraform outputs exist
if [ ! -f "terraform-outputs.txt" ]; then
    echo -e "${RED}❌ terraform-outputs.txt not found${NC}"
    echo "Please run 'terraform output > terraform-outputs.txt' first"
    exit 1
fi

# Read values from terraform outputs
EC2_IP=$(grep "ec2_public_ip" terraform-outputs.txt | awk '{print $3}' | tr -d '"')
RDS_ENDPOINT=$(grep "rds_address" terraform-outputs.txt | awk '{print $3}' | tr -d '"')
DOMAIN=$(grep "domain_name" terraform-outputs.txt | awk '{print $3}' | tr -d '"')

if [ -z "$EC2_IP" ] || [ -z "$RDS_ENDPOINT" ] || [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Failed to read terraform outputs${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Configuration:${NC}"
echo "  EC2 IP: $EC2_IP"
echo "  RDS Endpoint: $RDS_ENDPOINT"
echo "  Domain: $DOMAIN"
echo ""

# Check SSH key
read -p "Enter path to SSH private key (default: ~/.ssh/vsl-platform-key): " SSH_KEY
SSH_KEY=${SSH_KEY:-~/.ssh/vsl-platform-key}

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    exit 1
fi

# Get RDS password
read -sp "Enter RDS password: " RDS_PASSWORD
echo ""

# Get email for Let's Encrypt
read -p "Enter email for Let's Encrypt SSL certificate: " EMAIL

# Get Git repository URL (optional, can be set via environment variable)
if [ -z "$GIT_REPO_URL" ]; then
    read -p "Enter Git repository URL (or press Enter to skip and clone manually): " GIT_REPO_URL
fi

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo -e "${GREEN}🚀 Starting deployment...${NC}"
echo ""

# Step 1: Test SSH connection
echo -e "${GREEN}Step 1: Testing SSH connection...${NC}"
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo 'SSH OK'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    echo "Please check:"
    echo "  1. SSH key path is correct"
    echo "  2. EC2 security group allows SSH (port 22)"
    echo "  3. EC2 instance is running"
    exit 1
fi

# Step 2: Upload deployment script to EC2
echo ""
echo -e "${GREEN}Step 2: Uploading deployment script...${NC}"

cat > /tmp/deploy-on-ec2.sh <<'DEPLOYSCRIPT'
#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RDS_ENDPOINT="$1"
RDS_PASSWORD="$2"
JWT_SECRET="$3"
DOMAIN="$4"
EMAIL="$5"
GIT_REPO_URL="$6"

echo -e "${BLUE}🚀 Deploying on EC2...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker not found, installing...${NC}"
    sudo yum update -y
    sudo yum install docker -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
    echo -e "${GREEN}✅ Docker installed${NC}"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose not found, installing...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
fi

# Add user to docker group (may need to logout/login)
sudo usermod -aG docker ec2-user || true

# Clone or update repository
# Note: Update GIT_REPO_URL in deploy-full.sh or set as environment variable
GIT_REPO_URL=${GIT_REPO_URL:-""}

if [ -d "vsl-platform" ]; then
    echo -e "${GREEN}📦 Updating repository...${NC}"
    cd vsl-platform
    git pull || true
else
    if [ -z "$GIT_REPO_URL" ]; then
        echo -e "${YELLOW}⚠️  GIT_REPO_URL not set. Please clone repository manually:${NC}"
        echo "   git clone <your-repo-url> vsl-platform"
        echo "   cd vsl-platform/vsl-platform-backend"
        echo "   Then run deployment script again"
        exit 1
    fi
    echo -e "${GREEN}📦 Cloning repository from $GIT_REPO_URL...${NC}"
    git clone "$GIT_REPO_URL" vsl-platform || {
        echo -e "${RED}❌ Git clone failed. Please check:${NC}"
        echo "  1. Repository URL is correct"
        echo "  2. SSH key is configured (for private repos)"
        echo "  3. Network connection is available"
        exit 1
    }
    cd vsl-platform
fi

# Go to backend directory
cd vsl-platform-backend

# Update docker-compose file
echo -e "${GREEN}📝 Updating docker-compose configuration...${NC}"

if [ ! -f "docker-compose.free-tier.yml" ]; then
    echo -e "${RED}❌ docker-compose.free-tier.yml not found${NC}"
    exit 1
fi

# Backup original
cp docker-compose.free-tier.yml docker-compose.free-tier.yml.bak

# Replace placeholders
sed -i "s|jdbc:postgresql://.*:5432/vsl_db|jdbc:postgresql://${RDS_ENDPOINT}:5432/vsl_db|g" docker-compose.free-tier.yml
sed -i "s|SPRING_DATASOURCE_PASSWORD:.*|SPRING_DATASOURCE_PASSWORD: ${RDS_PASSWORD}|g" docker-compose.free-tier.yml
sed -i "s|JWT_SECRET:.*|JWT_SECRET: ${JWT_SECRET}|g" docker-compose.free-tier.yml || true
sed -i "s|NEXT_PUBLIC_API_URL:.*|NEXT_PUBLIC_API_URL: https://api.${DOMAIN}/api|g" docker-compose.free-tier.yml

# Add or update CORS_ALLOWED_ORIGINS
if grep -q "CORS_ALLOWED_ORIGINS:" docker-compose.free-tier.yml; then
    sed -i "s|CORS_ALLOWED_ORIGINS:.*|CORS_ALLOWED_ORIGINS: https://${DOMAIN},https://www.${DOMAIN},http://${DOMAIN},http://www.${DOMAIN}|g" docker-compose.free-tier.yml
else
    sed -i "/SERVER_PORT: 8080/a\      CORS_ALLOWED_ORIGINS: https://${DOMAIN},https://www.${DOMAIN},http://${DOMAIN},http://www.${DOMAIN}" docker-compose.free-tier.yml
fi

# Stop existing containers
echo -e "${GREEN}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.free-tier.yml down || true

# Build and start containers
echo -e "${GREEN}🔨 Building Docker images...${NC}"
docker-compose -f docker-compose.free-tier.yml build --no-cache

echo -e "${GREEN}🚀 Starting containers...${NC}"
docker-compose -f docker-compose.free-tier.yml up -d

# Wait for services
echo -e "${GREEN}⏳ Waiting for services to start...${NC}"
sleep 30

# Check container status
echo -e "${GREEN}📊 Container Status:${NC}"
docker-compose -f docker-compose.free-tier.yml ps

# Setup Nginx
echo -e "${GREEN}🌐 Setting up Nginx...${NC}"

sudo tee /etc/nginx/conf.d/vsl-platform.conf > /dev/null <<EOF
# Frontend
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.${DOMAIN};

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Test Nginx config
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx configured${NC}"
else
    echo -e "${RED}❌ Nginx configuration error${NC}"
    exit 1
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo -e "${GREEN}📦 Installing Certbot...${NC}"
    sudo yum install certbot python3-certbot-nginx -y
fi

# Get SSL certificate
echo -e "${GREEN}🔒 Getting SSL certificate...${NC}"
sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d api.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    --redirect || {
    echo -e "${YELLOW}⚠️  SSL certificate setup failed. This might be due to:${NC}"
    echo "  1. DNS not propagated yet (wait 15-60 minutes)"
    echo "  2. Port 80 not accessible"
    echo "  3. Domain not pointing to this server"
    echo ""
    echo "You can retry SSL setup later with:"
    echo "  sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d api.${DOMAIN}"
}

echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo "🌐 Your application:"
echo "   Frontend: http://${DOMAIN}"
echo "   Backend API: http://api.${DOMAIN}"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.free-tier.yml logs -f"
echo "   Restart: docker-compose -f docker-compose.free-tier.yml restart"
echo "   Stop: docker-compose -f docker-compose.free-tier.yml down"
DEPLOYSCRIPT

scp -i "$SSH_KEY" /tmp/deploy-on-ec2.sh ec2-user@$EC2_IP:/home/ec2-user/deploy-on-ec2.sh
ssh -i "$SSH_KEY" ec2-user@$EC2_IP "chmod +x /home/ec2-user/deploy-on-ec2.sh"

# Step 3: Run deployment on EC2
echo ""
echo -e "${GREEN}Step 3: Running deployment on EC2...${NC}"
echo -e "${YELLOW}⚠️  This may take 10-15 minutes...${NC}"

ssh -i "$SSH_KEY" ec2-user@$EC2_IP "/home/ec2-user/deploy-on-ec2.sh '$RDS_ENDPOINT' '$RDS_PASSWORD' '$JWT_SECRET' '$DOMAIN' '$EMAIL' '$GIT_REPO_URL'"

# Step 4: Verify deployment
echo ""
echo -e "${GREEN}Step 4: Verifying deployment...${NC}"
sleep 10

if curl -f -s http://$EC2_IP:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not responding yet${NC}"
fi

if curl -f -s http://$EC2_IP:8080/api/dictionary/count > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is running${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API not responding yet${NC}"
fi

# Final info
echo ""
echo -e "${GREEN}✅ Deployment process completed!${NC}"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://${DOMAIN} (or http://${EC2_IP}:3000)"
echo "   Backend: http://api.${DOMAIN} (or http://${EC2_IP}:8080/api)"
echo ""
echo "📝 Next steps:"
echo "   1. Wait for DNS propagation (15-60 minutes)"
echo "   2. Check SSL certificate: ssh into EC2 and run 'sudo certbot certificates'"
echo "   3. Test your application at https://${DOMAIN}"
echo ""
echo "🔍 Troubleshooting:"
echo "   SSH into EC2: ssh -i $SSH_KEY ec2-user@$EC2_IP"
echo "   View logs: docker-compose -f docker-compose.free-tier.yml logs -f"
echo "   Check Nginx: sudo systemctl status nginx"
echo ""
