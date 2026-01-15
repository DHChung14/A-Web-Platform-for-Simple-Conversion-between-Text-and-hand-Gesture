#!/bin/bash

# ==================== Quick Deploy Script ====================
# Script deploy nhanh với các giá trị đã biết
# =================================================================

set -e

EC2_IP="52.220.1.69"
RDS_ENDPOINT="vsl-platform-db.cjaqs60io7ay.ap-southeast-1.rds.amazonaws.com"
DOMAIN="canhnq.online"

echo "🚀 Quick Deploy - VSL Platform"
echo "=============================="
echo ""
echo "EC2 IP: $EC2_IP"
echo "Domain: $DOMAIN"
echo "RDS: $RDS_ENDPOINT"
echo ""

# Get inputs
read -sp "Enter RDS password: " RDS_PASSWORD
echo ""
read -p "Enter email for SSL: " EMAIL
read -p "Enter Git repository URL (or press Enter to skip): " GIT_REPO_URL

# Generate JWT
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo "Starting deployment..."
echo ""

# Run deploy-full.sh với các giá trị
cd "$(dirname "$0")"
bash deploy-full.sh <<EOF
~/.ssh/vsl-platform-key
$RDS_PASSWORD
$EMAIL
$GIT_REPO_URL
EOF
