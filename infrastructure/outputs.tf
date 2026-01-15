# ==================== Outputs ====================

output "ec2_public_ip" {
  description = "EC2 instance public IP"
  value       = aws_eip.vsl_platform.public_ip
}

output "ec2_public_dns" {
  description = "EC2 instance public DNS"
  value       = aws_instance.vsl_platform.public_dns
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.vsl_platform.id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.vsl_platform.endpoint
}

output "rds_address" {
  description = "RDS instance address (hostname only)"
  value       = aws_db_instance.vsl_platform.address
}

output "rds_port" {
  description = "RDS instance port"
  value       = aws_db_instance.vsl_platform.port
}

output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

output "website_url" {
  description = "Website URL"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

output "ssh_command" {
  description = "SSH command to connect to EC2"
  value       = "ssh -i <your-key.pem> ec2-user@${aws_eip.vsl_platform.public_ip}"
}

output "rds_connection_string" {
  description = "RDS connection string (for docker-compose)"
  value       = "jdbc:postgresql://${aws_db_instance.vsl_platform.address}:${aws_db_instance.vsl_platform.port}/${var.db_name}"
  sensitive   = true
}

