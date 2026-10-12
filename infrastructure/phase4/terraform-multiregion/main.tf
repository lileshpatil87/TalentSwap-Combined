terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.primary_region
}

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}

resource "aws_rds_global_cluster" "talentswap" {
  global_cluster_identifier = var.global_cluster_identifier
  engine                   = "aurora-postgresql"
  engine_version           = var.engine_version
  database_name            = var.database_name
  storage_encrypted        = true
  deletion_protection      = true
}

resource "aws_db_subnet_group" "primary" {
  name       = "${var.cluster_identifier}-private"
  subnet_ids = var.subnet_ids_primary
}

resource "aws_rds_cluster" "primary" {
  cluster_identifier           = var.cluster_identifier
  global_cluster_identifier    = aws_rds_global_cluster.talentswap.id
  engine                       = "aurora-postgresql"
  engine_version               = var.engine_version
  database_name                = var.database_name
  master_username              = var.master_username
  manage_master_user_password  = true
  db_subnet_group_name         = aws_db_subnet_group.primary.name
  vpc_security_group_ids       = var.vpc_security_group_ids_primary
  storage_encrypted            = true
  backup_retention_period      = 14
  preferred_backup_window      = "06:00-07:00"
  deletion_protection          = true
  copy_tags_to_snapshot         = true
  enabled_cloudwatch_logs_exports = ["postgresql"]
  skip_final_snapshot          = false
  final_snapshot_identifier    = "${var.cluster_identifier}-final-snapshot"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_rds_cluster_instance" "primary" {
  count                = 2
  identifier           = "${var.cluster_identifier}-${count.index + 1}"
  cluster_identifier  = aws_rds_cluster.primary.id
  instance_class       = var.instance_class
  engine               = aws_rds_cluster.primary.engine
  engine_version       = aws_rds_cluster.primary.engine_version
  db_subnet_group_name = aws_db_subnet_group.primary.name
  publicly_accessible  = false
}

resource "aws_db_subnet_group" "secondary" {
  provider   = aws.secondary
  name       = "${var.cluster_identifier}-secondary-private"
  subnet_ids = var.subnet_ids_secondary
}

resource "aws_rds_cluster" "secondary" {
  provider                    = aws.secondary
  cluster_identifier          = "${var.cluster_identifier}-secondary"
  global_cluster_identifier   = aws_rds_global_cluster.talentswap.id
  engine                      = "aurora-postgresql"
  engine_version              = var.engine_version
  db_subnet_group_name        = aws_db_subnet_group.secondary.name
  vpc_security_group_ids      = var.vpc_security_group_ids_secondary
  storage_encrypted           = true
  backup_retention_period     = 7
  skip_final_snapshot         = true

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_rds_cluster_instance" "secondary" {
  provider             = aws.secondary
  count                = 1
  identifier           = "${var.cluster_identifier}-secondary-${count.index + 1}"
  cluster_identifier  = aws_rds_cluster.secondary.id
  instance_class       = var.instance_class
  engine               = aws_rds_cluster.secondary.engine
  engine_version       = aws_rds_cluster.secondary.engine_version
  db_subnet_group_name = aws_db_subnet_group.secondary.name
  publicly_accessible  = false
}

output "primary_writer_endpoint" {
  value = aws_rds_cluster.primary.endpoint
}

output "secondary_reader_endpoint" {
  value = aws_rds_cluster.secondary.reader_endpoint
}

output "master_secret_arn" {
  value     = aws_rds_cluster.primary.master_user_secret[0].secret_arn
  sensitive = true
}
