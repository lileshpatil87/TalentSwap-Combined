variable "primary_region" {
  type        = string
  description = "AWS region for the writable Aurora cluster."
}

variable "secondary_region" {
  type        = string
  description = "AWS region for the global database secondary."
}

variable "global_cluster_identifier" {
  type    = string
  default = "talentswap-global"
}

variable "cluster_identifier" {
  type    = string
  default = "talentswap-primary"
}

variable "engine_version" {
  type        = string
  description = "Use a currently supported Aurora PostgreSQL engine version after compatibility review."
}

variable "database_name" {
  type    = string
  default = "talentswap"
}

variable "master_username" {
  type        = string
  description = "Database administrator username; AWS Secrets Manager manages its password."
}

variable "subnet_ids_primary" {
  type        = list(string)
  description = "Private subnets across at least two AZs."
}

variable "subnet_ids_secondary" {
  type        = list(string)
  description = "Private subnets across at least two AZs."
}

variable "vpc_security_group_ids_primary" {
  type = list(string)
}

variable "vpc_security_group_ids_secondary" {
  type = list(string)
}

variable "instance_class" {
  type    = string
  default = "db.r6g.large"
}
