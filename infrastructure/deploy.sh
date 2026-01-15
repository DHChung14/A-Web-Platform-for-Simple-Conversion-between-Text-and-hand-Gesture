#!/bin/bash

# ==================== Terraform Deploy Script ====================
# Script tự động hóa deploy infrastructure với Terraform
# =================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 VSL Platform - Terraform Deploy Script${NC}"
echo "=========================================="

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    echo "Install: https://www.terraform.io/downloads"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo "Install: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo -e "${YELLOW}⚠️  terraform.tfvars not found${NC}"
    echo "Creating from terraform.tfvars.example..."
    
    if [ ! -f "terraform.tfvars.example" ]; then
        echo -e "${RED}❌ terraform.tfvars.example not found${NC}"
        exit 1
    fi
    
    cp terraform.tfvars.example terraform.tfvars
    echo -e "${YELLOW}⚠️  Please edit terraform.tfvars and fill in your values${NC}"
    echo "Then run this script again."
    exit 1
fi

# Menu
echo ""
echo "Select action:"
echo "1) Initialize Terraform"
echo "2) Plan (preview changes)"
echo "3) Apply (create/update infrastructure)"
echo "4) Destroy (delete all resources)"
echo "5) Show outputs"
echo "6) Validate configuration"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        echo -e "${GREEN}📦 Initializing Terraform...${NC}"
        terraform init
        ;;
    2)
        echo -e "${GREEN}📋 Planning changes...${NC}"
        terraform plan
        ;;
    3)
        echo -e "${YELLOW}⚠️  This will create/update infrastructure${NC}"
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}🚀 Applying changes...${NC}"
            terraform apply
            echo ""
            echo -e "${GREEN}✅ Infrastructure deployed!${NC}"
            echo ""
            echo "📊 Outputs:"
            terraform output
        else
            echo "Cancelled."
        fi
        ;;
    4)
        echo -e "${RED}⚠️  WARNING: This will DESTROY all resources!${NC}"
        read -p "Are you sure? Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            echo -e "${RED}🗑️  Destroying infrastructure...${NC}"
            terraform destroy
        else
            echo "Cancelled."
        fi
        ;;
    5)
        echo -e "${GREEN}📊 Current outputs:${NC}"
        terraform output
        ;;
    6)
        echo -e "${GREEN}✅ Validating configuration...${NC}"
        terraform validate
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

