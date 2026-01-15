#!/bin/bash

# ==================== START DEPLOYMENT ====================
# Script đơn giản để bắt đầu deployment
# ==========================================================

clear

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🚀 VSL PLATFORM - DEPLOYMENT WIZARD                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Thông tin Infrastructure:"
echo "   EC2 IP: 52.220.1.69"
echo "   Domain: canhnq.online"
echo "   RDS: vsl-platform-db.cjaqs60io7ay.ap-southeast-1.rds.amazonaws.com"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: RDS Password
echo "📝 Step 1/3: RDS Database Password"
read -sp "   Nhập RDS password: " RDS_PASSWORD
echo ""
echo ""

# Step 2: Email for SSL
echo "📝 Step 2/3: Email cho SSL Certificate"
read -p "   Nhập email (cho Let's Encrypt): " EMAIL
echo ""

# Step 3: Git Repository
echo "📝 Step 3/3: Git Repository (có thể bỏ qua)"
read -p "   Nhập Git repository URL (hoặc Enter để bỏ qua): " GIT_REPO_URL
echo ""

# Confirm
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Xác nhận thông tin:"
echo "   RDS Password: [hidden]"
echo "   Email: $EMAIL"
echo "   Git Repo: ${GIT_REPO_URL:-'Sẽ clone manual sau'}"
echo ""
read -p "✅ Bắt đầu deploy? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "❌ Deployment cancelled."
    exit 0
fi

echo ""
echo "🚀 Bắt đầu deployment..."
echo "   (Quá trình này có thể mất 10-15 phút)"
echo ""

# Export variables
export RDS_ENDPOINT="vsl-platform-db.cjaqs60io7ay.ap-southeast-1.rds.amazonaws.com"
export RDS_PASSWORD
export EMAIL
export GIT_REPO_URL
export DOMAIN="canhnq.online"
export EC2_IP="52.220.1.69"

# Generate JWT secret
export JWT_SECRET=$(openssl rand -hex 32)

# Run deployment
cd "$(dirname "$0")"
bash deploy-full.sh <<EOF
~/.ssh/vsl-platform-key
$RDS_PASSWORD
$EMAIL
$GIT_REPO_URL
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌐 Kiểm tra ứng dụng:"
echo "   Frontend: https://canhnq.online"
echo "   Backend: https://api.canhnq.online/api/dictionary/count"
echo ""
echo "⏳ Lưu ý: Nếu SSL chưa được setup, đợi 15-60 phút để DNS propagate"
echo "   Sau đó chạy: ssh -i ~/.ssh/vsl-platform-key ec2-user@52.220.1.69"
echo "   sudo certbot --nginx -d canhnq.online -d www.canhnq.online -d api.canhnq.online"
echo ""
