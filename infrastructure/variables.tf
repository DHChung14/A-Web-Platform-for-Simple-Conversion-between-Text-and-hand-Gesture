# ==================== Variables ====================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1" # Singapore (gần VN nhất)
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "vsl-platform"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "canhnq.online"
}

# ==================== EC2 Variables ====================

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small" # Upgraded from t3.micro (2GB RAM vs 1GB) - Better performance, less timeout
  # Note: t3.micro (1GB RAM) is too small for 3 services (Frontend + Backend + AI Service)
  # t3.small (2GB RAM) is recommended for stable operation
  # Cost: ~$15-20/month (vs Free Tier t3.micro)
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
  sensitive   = true
}

# ==================== RDS Variables ====================

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro" # Free Tier eligible
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "vsl_db"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

