#!/bin/bash

# ==================== Fix EC2 Connection Issue ====================
# Script để fix EC2 instance reachability issue
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTANCE_ID="i-0ce5cd9cee27874fc"
EC2_IP="52.220.1.69"

echo -e "${BLUE}🔧 Fix EC2 Connection Issue${NC}"
echo "=========================================="
echo ""
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $EC2_IP"
echo ""

# Check current status
echo -e "${GREEN}📊 Current Status:${NC}"
aws ec2 describe-instance-status --instance-ids $INSTANCE_ID --include-all-instances --query 'InstanceStatuses[0].[InstanceStatus.Status,SystemStatus.Status,InstanceState.Name]' --output table

echo ""
read -p "Instance đang ở trạng thái 'impaired'. Bạn có muốn restart instance không? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Stop instance
echo -e "${YELLOW}🛑 Stopping instance...${NC}"
aws ec2 stop-instances --instance-ids $INSTANCE_ID

echo -e "${YELLOW}⏳ Waiting for instance to stop...${NC}"
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID
echo -e "${GREEN}✅ Instance stopped${NC}"

# Wait a bit
sleep 10

# Start instance
echo -e "${GREEN}🚀 Starting instance...${NC}"
aws ec2 start-instances --instance-ids $INSTANCE_ID

echo -e "${YELLOW}⏳ Waiting for instance to start...${NC}"
aws ec2 wait instance-running --instance-ids $INSTANCE_ID
echo -e "${GREEN}✅ Instance started${NC}"

# Wait for instance to fully boot
echo -e "${YELLOW}⏳ Waiting for instance to fully boot (2 minutes)...${NC}"
sleep 120

# Check status again
echo ""
echo -e "${GREEN}📊 New Status:${NC}"
aws ec2 describe-instance-status --instance-ids $INSTANCE_ID --include-all-instances --query 'InstanceStatuses[0].[InstanceStatus.Status,SystemStatus.Status,InstanceState.Name]' --output table

# Test SSH
echo ""
echo -e "${GREEN}🔍 Testing SSH connection...${NC}"
if ssh -i ~/.ssh/vsl-platform-key -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@$EC2_IP "echo 'SSH OK' && hostname" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful!${NC}"
    echo ""
    echo "Bạn có thể SSH vào instance:"
    echo "  ssh -i ~/.ssh/vsl-platform-key ec2-user@$EC2_IP"
else
    echo -e "${YELLOW}⚠️  SSH still not working. Đợi thêm 1-2 phút và thử lại.${NC}"
    echo ""
    echo "Hoặc kiểm tra qua AWS Console → EC2 → Connect"
fi

echo ""
echo -e "${GREEN}✅ Process completed!${NC}"
