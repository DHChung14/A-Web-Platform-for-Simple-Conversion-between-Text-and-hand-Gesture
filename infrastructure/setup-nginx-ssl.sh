#!/bin/bash

# ==================== Setup Nginx + SSL Script ====================
# Script tự động setup Nginx reverse proxy và SSL certificate
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="canhnq.online"

echo -e "${BLUE}🌐 Setup Nginx Reverse Proxy + SSL${NC}"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Step 1: Create Nginx config
echo ""
echo -e "${GREEN}Step 1: Creating Nginx configuration...${NC}"

NGINX_CONFIG="/etc/nginx/conf.d/vsl-platform.conf"

cat > $NGINX_CONFIG <<EOF
# HTTP → HTTPS redirect (sẽ setup SSL sau)
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN} api.${DOMAIN};

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

echo -e "${GREEN}✅ Nginx config created${NC}"

# Step 2: Test and reload Nginx
echo ""
echo -e "${GREEN}Step 2: Testing Nginx configuration...${NC}"

if nginx -t; then
    echo -e "${GREEN}✅ Nginx config is valid${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded${NC}"
else
    echo -e "${RED}❌ Nginx config has errors${NC}"
    exit 1
fi

# Step 3: Install Certbot
echo ""
echo -e "${GREEN}Step 3: Installing Certbot...${NC}"

if command -v certbot &> /dev/null; then
    echo -e "${GREEN}✅ Certbot already installed${NC}"
else
    yum install certbot python3-certbot-nginx -y
    echo -e "${GREEN}✅ Certbot installed${NC}"
fi

# Step 4: Get SSL certificate
echo ""
echo -e "${GREEN}Step 4: Getting SSL certificate from Let's Encrypt...${NC}"
echo -e "${YELLOW}⚠️  This will prompt for email and agreement${NC}"

read -p "Enter your email for Let's Encrypt: " EMAIL

certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d api.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate obtained${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo "Common issues:"
    echo "  1. DNS not propagated yet (wait 15-60 minutes)"
    echo "  2. Port 80 not accessible from internet"
    echo "  3. Domain not pointing to this server"
    exit 1
fi

# Step 5: Test auto-renewal
echo ""
echo -e "${GREEN}Step 5: Testing certificate auto-renewal...${NC}"

certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Auto-renewal configured${NC}"
else
    echo -e "${YELLOW}⚠️  Auto-renewal test failed (check later)${NC}"
fi

# Step 6: Verify SSL
echo ""
echo -e "${GREEN}Step 6: Verifying SSL...${NC}"

sleep 5

if curl -I https://${DOMAIN} > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS is working${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS not responding yet (may need DNS propagation)${NC}"
fi

# Final info
echo ""
echo -e "${GREEN}✅ Nginx + SSL setup completed!${NC}"
echo ""
echo "🌐 Your application is now accessible at:"
echo "   https://${DOMAIN}"
echo "   https://www.${DOMAIN}"
echo "   https://api.${DOMAIN}"
echo ""
echo "📝 Useful commands:"
echo "   Check SSL: sudo certbot certificates"
echo "   Renew SSL: sudo certbot renew"
echo "   Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "   Nginx status: sudo systemctl status nginx"
echo ""

