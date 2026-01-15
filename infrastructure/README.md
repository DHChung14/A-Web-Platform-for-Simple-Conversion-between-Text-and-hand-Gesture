# 🏗️ VSL Platform - Terraform Infrastructure

Terraform code để deploy VSL Platform lên AWS với EC2 và RDS PostgreSQL (Free Tier).

## 📋 Tổng quan

Infrastructure này tạo:
- **EC2 t2.micro** (Free Tier): Chạy Docker containers (Frontend, Backend, AI Service)
- **RDS PostgreSQL db.t2.micro** (Free Tier): Database
- **Route 53 DNS**: Domain `canhnq.online` và subdomains
- **Security Groups**: Firewall rules cho EC2 và RDS
- **Elastic IP**: IP tĩnh cho EC2

## 🚀 Quick Start

### Bước 1: Prerequisites

```bash
# Install Terraform
# macOS
brew install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verify
terraform version
```

### Bước 2: Setup AWS Credentials

```bash
# Install AWS CLI
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# AWS Access Key ID: <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region: ap-southeast-1
# Default output format: json
```

### Bước 3: Setup Route 53 Hosted Zone

**Quan trọng:** Domain `canhnq.online` phải đã được setup trong Route 53 trước khi chạy Terraform.

1. Vào **AWS Console** → **Route 53** → **Hosted zones**
2. Click **"Create hosted zone"**
3. Domain name: `canhnq.online`
4. Type: **Public hosted zone**
5. Click **"Create hosted zone"**
6. Copy **Name Servers** và update ở domain registrar (nơi bạn mua domain)

### Bước 4: Generate SSH Key (nếu chưa có)

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/vsl-platform-key -C "vsl-platform"

# View public key
cat ~/.ssh/vsl-platform-key.pub
```

### Bước 5: Configure Terraform Variables

```bash
cd infrastructure

# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars
nano terraform.tfvars
```

**Fill in values:**

```hcl
aws_region  = "ap-southeast-1"
environment = "production"
project_name = "vsl-platform"
domain_name  = "canhnq.online"

ec2_instance_type = "t2.micro"

# Paste your SSH public key
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC..."

rds_instance_class = "db.t2.micro"
db_name            = "vsl_db"
db_username        = "postgres"

# Generate strong password
# openssl rand -base64 32
db_password = "your-strong-password-here"
```

### Bước 6: Initialize Terraform

```bash
terraform init
```

### Bước 7: Plan (Preview Changes)

```bash
terraform plan
```

### Bước 8: Apply (Create Infrastructure)

```bash
terraform apply
```

Type `yes` khi được hỏi.

### Bước 9: Get Outputs

```bash
# View all outputs
terraform output

# View specific output
terraform output ec2_public_ip
terraform output rds_endpoint
```

## 📊 Infrastructure Details

### EC2 Instance

- **Type**: t2.micro (Free Tier)
- **AMI**: Amazon Linux 2023
- **Storage**: 30GB gp3 (Free Tier: 30GB EBS free)
- **Auto-install**: Docker, Docker Compose, Nginx, GitLab Runner

### RDS PostgreSQL

- **Type**: db.t2.micro (Free Tier)
- **Engine**: PostgreSQL 16.1
- **Storage**: 20GB (Free Tier limit)
- **Public Access**: Yes (để EC2 connect được)

### Security Groups

**EC2 Security Group:**
- SSH (22): From anywhere
- HTTP (80): From anywhere
- HTTPS (443): From anywhere
- Frontend (3000): From anywhere
- Backend (8080): From anywhere
- AI Service (5000): From anywhere

**RDS Security Group:**
- PostgreSQL (5432): Only from EC2 Security Group

### Route 53 DNS Records

- `canhnq.online` → EC2 Elastic IP
- `www.canhnq.online` → EC2 Elastic IP
- `api.canhnq.online` → EC2 Elastic IP

## 🔧 Usage

### SSH vào EC2

```bash
# Get SSH command from output
terraform output ssh_command

# Or manually
ssh -i ~/.ssh/vsl-platform-key ec2-user@<EC2_IP>
```

### Update Infrastructure

```bash
# Edit .tf files
nano main.tf

# Plan changes
terraform plan

# Apply changes
terraform apply
```

### Destroy Infrastructure

```bash
# Destroy all resources
terraform destroy
```

**⚠️ Warning:** This will delete everything! Make sure you have backups.

## 📝 Outputs

Sau khi `terraform apply`, bạn sẽ có:

- `ec2_public_ip`: IP của EC2 instance
- `rds_endpoint`: RDS connection endpoint
- `website_url`: URL website (https://canhnq.online)
- `api_url`: URL API (https://api.canhnq.online)

## 🔐 Security Notes

1. **SSH Key**: Giữ private key (`~/.ssh/vsl-platform-key`) an toàn, không commit vào git
2. **Database Password**: Dùng password mạnh, không commit vào git
3. **Security Groups**: Trong production, nên restrict SSH (22) chỉ từ IP của bạn
4. **RDS**: Có thể set `publicly_accessible = false` và dùng VPC peering nếu cần

## 💰 Cost Estimation

Với Free Tier (first 12 months):

| Resource | Free Tier | Cost After Free Tier |
|----------|-----------|----------------------|
| EC2 t2.micro | 750 hrs/month | ~$8.50/month |
| RDS db.t2.micro | 750 hrs/month | ~$15/month |
| EBS 30GB | 30GB free | ~$3/month |
| RDS Storage 20GB | 20GB free | ~$2.30/month |
| Elastic IP | Free if attached | $0.005/hour if unattached |
| Route 53 | $0.50/hosted zone | $0.50/month |
| **TOTAL** | **$0** | **~$29/month** |

## 🐛 Troubleshooting

### Error: Route 53 hosted zone not found

```bash
# Check if hosted zone exists
aws route53 list-hosted-zones

# Create hosted zone manually if needed
aws route53 create-hosted-zone --name canhnq.online --caller-reference $(date +%s)
```

### Error: SSH key already exists

```bash
# Delete existing key
aws ec2 delete-key-pair --key-name vsl-platform-key

# Or use existing key in terraform.tfvars
```

### Error: RDS creation failed

```bash
# Check RDS limits
aws rds describe-account-attributes

# Free Tier chỉ cho phép 1 RDS instance
```

## 📚 Next Steps

Sau khi infrastructure đã được tạo:

1. **SSH vào EC2** và setup application:
   ```bash
   ssh -i ~/.ssh/vsl-platform-key ec2-user@<EC2_IP>
   ```

2. **Clone code và deploy**:
   ```bash
   git clone <your-repo> vsl-platform
   cd vsl-platform/vsl-platform-backend
   ```

3. **Update docker-compose.free-tier.yml** với RDS endpoint:
   ```yaml
   SPRING_DATASOURCE_URL: jdbc:postgresql://<RDS_ENDPOINT>:5432/vsl_db
   ```

4. **Setup Nginx** với SSL (Let's Encrypt):
   ```bash
   sudo certbot --nginx -d canhnq.online -d www.canhnq.online
   ```

5. **Deploy application**:
   ```bash
   docker-compose -f docker-compose.free-tier.yml up -d
   ```

## 📖 References

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)

---

**Tác giả**: AI Assistant  
**Ngày tạo**: 2024  
**Version**: 1.0

