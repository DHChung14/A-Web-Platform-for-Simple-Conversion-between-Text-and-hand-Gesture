#!/bin/bash

# ==================== VSL Platform - Deployment Check Script ====================
# Script kiểm tra trạng thái deployment
# =================================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 VSL Platform - Deployment Status Check${NC}"
echo "=========================================="

# Check if terraform outputs exist
if [ ! -f "terraform-outputs.txt" ]; then
    echo -e "${YELLOW}⚠️  terraform-outputs.txt not found${NC}"
    echo "Running 'terraform output > terraform-outputs.txt'..."
    terraform output > terraform-outputs.txt 2>/dev/null || {
        echo -e "${RED}❌ Failed to get terraform outputs${NC}"
        exit 1
    }
fi

# Read values
EC2_IP=$(grep "ec2_public_ip" terraform-outputs.txt | awk '{print $3}' | tr -d '"')
RDS_ENDPOINT=$(grep "rds_address" terraform-outputs.txt | awk '{print $3}' | tr -d '"')
DOMAIN=$(grep "domain_name" terraform-outputs.txt | awk '{print $3}' | tr -d '"')

if [ -z "$EC2_IP" ] || [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Failed to read terraform outputs${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Configuration:${NC}"
echo "  EC2 IP: $EC2_IP"
echo "  Domain: $DOMAIN"
[ -n "$RDS_ENDPOINT" ] && echo "  RDS Endpoint: $RDS_ENDPOINT"
echo ""

# Check SSH key
read -p "Enter path to SSH private key (default: ~/.ssh/vsl-platform-key): " SSH_KEY
SSH_KEY=${SSH_KEY:-~/.ssh/vsl-platform-key}

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Checking deployment status...${NC}"
echo ""

# 1. Check DNS
echo -e "${GREEN}1. Checking DNS...${NC}"
if nslookup $DOMAIN > /dev/null 2>&1; then
    DNS_IP=$(nslookup $DOMAIN | grep -A 1 "Name:" | tail -1 | awk '{print $2}')
    if [ "$DNS_IP" = "$EC2_IP" ]; then
        echo -e "   ✅ DNS points to EC2 IP ($EC2_IP)"
    else
        echo -e "   ${YELLOW}⚠️  DNS points to $DNS_IP (expected $EC2_IP)${NC}"
    fi
else
    echo -e "   ${RED}❌ DNS not resolved${NC}"
fi

# 2. Check SSH connection
echo ""
echo -e "${GREEN}2. Checking SSH connection...${NC}"
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo 'OK'" > /dev/null 2>&1; then
    echo -e "   ✅ SSH connection successful"
else
    echo -e "   ${RED}❌ SSH connection failed${NC}"
    exit 1
fi

# 3. Check Docker containers
echo ""
echo -e "${GREEN}3. Checking Docker containers...${NC}"
CONTAINER_STATUS=$(ssh -i "$SSH_KEY" ec2-user@$EC2_IP "cd vsl-platform/vsl-platform-backend 2>/dev/null && docker-compose -f docker-compose.free-tier.yml ps 2>/dev/null || echo 'NOT_DEPLOYED'")

if echo "$CONTAINER_STATUS" | grep -q "NOT_DEPLOYED\|No such file"; then
    echo -e "   ${YELLOW}⚠️  Application not deployed yet${NC}"
    echo -e "   ${YELLOW}   Run deploy-full.sh to deploy${NC}"
else
    echo "$CONTAINER_STATUS" | grep -q "Up" && echo -e "   ✅ Containers are running" || echo -e "   ${RED}❌ Some containers are not running${NC}"
    echo ""
    echo "$CONTAINER_STATUS"
fi

# 4. Check services
echo ""
echo -e "${GREEN}4. Checking services...${NC}"

# Frontend
if curl -f -s --max-time 5 http://$EC2_IP:3000 > /dev/null 2>&1; then
    echo -e "   ✅ Frontend (port 3000) is accessible"
else
    echo -e "   ${RED}❌ Frontend (port 3000) is not accessible${NC}"
fi

# Backend
if curl -f -s --max-time 5 http://$EC2_IP:8080/api/dictionary/count > /dev/null 2>&1; then
    echo -e "   ✅ Backend API (port 8080) is accessible"
else
    echo -e "   ${RED}❌ Backend API (port 8080) is not accessible${NC}"
fi

# AI Service
if curl -f -s --max-time 5 http://$EC2_IP:5000/health > /dev/null 2>&1; then
    echo -e "   ✅ AI Service (port 5000) is accessible"
else
    echo -e "   ${YELLOW}⚠️  AI Service (port 5000) is not accessible${NC}"
fi

# 5. Check Nginx
echo ""
echo -e "${GREEN}5. Checking Nginx...${NC}"
NGINX_STATUS=$(ssh -i "$SSH_KEY" ec2-user@$EC2_IP "sudo systemctl is-active nginx 2>/dev/null || echo 'inactive'")

if [ "$NGINX_STATUS" = "active" ]; then
    echo -e "   ✅ Nginx is running"
else
    echo -e "   ${YELLOW}⚠️  Nginx is not running${NC}"
fi

# 6. Check SSL
echo ""
echo -e "${GREEN}6. Checking SSL certificate...${NC}"
SSL_CERTS=$(ssh -i "$SSH_KEY" ec2-user@$EC2_IP "sudo certbot certificates 2>/dev/null || echo 'NO_CERTBOT'")

if echo "$SSL_CERTS" | grep -q "$DOMAIN"; then
    echo -e "   ✅ SSL certificate exists for $DOMAIN"
else
    echo -e "   ${YELLOW}⚠️  SSL certificate not found${NC}"
    echo -e "   ${YELLOW}   Run: sudo certbot --nginx -d $DOMAIN${NC}"
fi

# 7. Check domain accessibility
echo ""
echo -e "${GREEN}7. Checking domain accessibility...${NC}"

# HTTP
if curl -f -s --max-time 5 http://$DOMAIN > /dev/null 2>&1; then
    echo -e "   ✅ HTTP accessible at http://$DOMAIN"
else
    echo -e "   ${YELLOW}⚠️  HTTP not accessible (may need DNS propagation)${NC}"
fi

# HTTPS
if curl -f -s --max-time 5 -k https://$DOMAIN > /dev/null 2>&1; then
    echo -e "   ✅ HTTPS accessible at https://$DOMAIN"
else
    echo -e "   ${YELLOW}⚠️  HTTPS not accessible${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "  EC2 IP: $EC2_IP"
echo "  Domain: $DOMAIN"
echo "  Frontend: http://$DOMAIN or http://$EC2_IP:3000"
echo "  Backend API: http://api.$DOMAIN or http://$EC2_IP:8080/api"
echo ""
echo -e "${GREEN}✅ Check completed!${NC}"
