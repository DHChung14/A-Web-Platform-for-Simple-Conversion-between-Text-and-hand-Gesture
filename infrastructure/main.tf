# ==================== VSL Platform - Terraform Infrastructure ====================
# Infrastructure: EC2 + RDS PostgreSQL (AWS Free Tier)
# Domain: canhnq.online
# =================================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "VSL-Platform"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ==================== Data Sources ====================

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get default subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "default" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Get Route 53 hosted zone for domain
# NOTE: Hosted zone must exist in Route 53 before running Terraform
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# ==================== Security Groups ====================

# Security Group for EC2
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Security group for VSL Platform EC2 instance"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    description = "SSH from anywhere (restrict in production)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Frontend (Next.js)
  ingress {
    description = "Frontend"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API
  ingress {
    description = "Backend API"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # AI Service
  ingress {
    description = "AI Service"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for VSL Platform RDS PostgreSQL"
  vpc_id      = data.aws_vpc.default.id

  # PostgreSQL from EC2 only
  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  # All outbound traffic
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# ==================== EC2 Instance ====================

# Key Pair (nếu chưa có, tạo mới)
resource "aws_key_pair" "vsl_platform" {
  key_name   = "${var.project_name}-key"
  public_key = var.ssh_public_key

  tags = {
    Name = "${var.project_name}-key"
  }
}

# EC2 Instance
resource "aws_instance" "vsl_platform" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.ec2_instance_type
  key_name               = aws_key_pair.vsl_platform.key_name
  vpc_security_group_ids = [aws_security_group.ec2.id]

  # Use first available subnet in default VPC
  subnet_id = tolist(data.aws_subnets.default.ids)[0]

  # Enable auto-assign public IP
  associate_public_ip_address = true

  # Root volume
  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30 # Free Tier: 30GB EBS free
    encrypted             = true
    delete_on_termination = true
  }

  # User data script để setup Docker, Nginx, etc.
  user_data = <<-EOF
    #!/bin/bash
    set -e  # Exit on error
    exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
    
    echo "Starting user-data script at $(date)"
    
    # Update system
    echo "Updating system packages..."
    yum update -y || { echo "Failed to update packages"; exit 1; }
    
    # Install Docker
    echo "Installing Docker..."
    yum install docker -y || { echo "Failed to install Docker"; exit 1; }
    systemctl start docker || { echo "Failed to start Docker"; exit 1; }
    systemctl enable docker || { echo "Failed to enable Docker"; exit 1; }
    usermod -aG docker ec2-user || echo "Warning: Failed to add ec2-user to docker group"
    
    # Install Docker Compose with retry
    echo "Installing Docker Compose..."
    for i in {1..3}; do
      if curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose; then
        chmod +x /usr/local/bin/docker-compose
        docker-compose --version && break
      fi
      echo "Attempt $i failed, retrying..."
      sleep 5
    done || { echo "Failed to install Docker Compose after 3 attempts"; exit 1; }
    
    # Install Nginx
    echo "Installing Nginx..."
    yum install nginx -y || { echo "Failed to install Nginx"; exit 1; }
    systemctl start nginx || { echo "Failed to start Nginx"; exit 1; }
    systemctl enable nginx || { echo "Failed to enable Nginx"; exit 1; }
    
    # Install GitLab Runner (optional)
    echo "Installing GitLab Runner..."
    curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh" | bash || echo "Warning: Failed to add GitLab Runner repo"
    yum install gitlab-runner -y || echo "Warning: Failed to install GitLab Runner"
    systemctl start gitlab-runner || echo "Warning: Failed to start GitLab Runner"
    systemctl enable gitlab-runner || echo "Warning: Failed to enable GitLab Runner"
    usermod -aG docker gitlab-runner || echo "Warning: Failed to add gitlab-runner to docker group"
    
    echo "User-data script completed successfully at $(date)"
  EOF

  tags = {
    Name = "${var.project_name}-ec2"
  }
}

# Elastic IP for EC2 (để có IP tĩnh)
resource "aws_eip" "vsl_platform" {
  domain   = "vpc"
  instance = aws_instance.vsl_platform.id

  tags = {
    Name = "${var.project_name}-eip"
  }
}

# ==================== RDS PostgreSQL ====================

# DB Subnet Group
resource "aws_db_subnet_group" "vsl_platform" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS Parameter Group (tối ưu cho Free Tier)
resource "aws_db_parameter_group" "vsl_platform" {
  name   = "${var.project_name}-pg-params"
  family = "postgres16"

  # Note: shared_buffers không thể set trong parameter group cho RDS
  # RDS tự động manage shared_buffers dựa trên instance class
  # max_connections là static parameter, cần pending-reboot

  parameter {
    name         = "max_connections"
    value        = "50" # Giảm từ default 100
    apply_method = "pending-reboot"
  }

  tags = {
    Name = "${var.project_name}-pg-params"
  }
}

# RDS Instance
resource "aws_db_instance" "vsl_platform" {
  identifier = "${var.project_name}-db"

  # Engine
  engine         = "postgres"
  engine_version = "16" # Use major version, AWS will use latest minor version
  instance_class = var.rds_instance_class

  # Database
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  # Storage
  allocated_storage     = 20 # Free Tier: 20GB
  max_allocated_storage = 20
  storage_type          = "gp3"
  storage_encrypted     = true

  # Network
  db_subnet_group_name   = aws_db_subnet_group.vsl_platform.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = true # Để EC2 connect được

  # Backup (Free Tier: max 1 day retention)
  backup_retention_period = 1 # Free Tier limit: 1 day
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  # Note: backup_retention_period = 1 is free tier limit

  # Performance
  parameter_group_name         = aws_db_parameter_group.vsl_platform.name
  performance_insights_enabled = false # Tắt để tiết kiệm

  # Other
  skip_final_snapshot = true # Set false trong production
  deletion_protection = false
  multi_az            = false # Tắt để tiết kiệm (Free Tier không support)

  tags = {
    Name = "${var.project_name}-rds"
  }
}

# ==================== Route 53 DNS ====================

# A record for domain
resource "aws_route53_record" "main" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.vsl_platform.public_ip]
}

# A record for www subdomain
resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.vsl_platform.public_ip]
}

# A record for api subdomain
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.vsl_platform.public_ip]
}

