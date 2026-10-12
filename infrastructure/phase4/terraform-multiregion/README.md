# Multi-region PostgreSQL / HA blueprint

This directory defines the deployment contract for Phase 4, not a safe-to-apply production stack by itself. Fill the reviewed network, KMS, backup, monitoring, and secret-manager modules before applying. Use a non-production AWS account first.

## Target topology
- Aurora PostgreSQL Global Database: one writable primary region and at least one secondary region.
- Private DB subnets, encryption at rest, TLS in transit, deletion protection, 7+ day backups, and no public database endpoints.
- Application reads use `DATABASE_READ_URL` for the closest regional reader; transactions and wallet writes always use the primary writer URL.
- Failover is an operator/automation workflow with a health gate; do not automatically promote a region solely from a single failed health check.
- Global database replication is asynchronous: the failover runbook must account for possible non-zero RPO.

## Required variables and guardrails
`AWS_PRIMARY_REGION`, `AWS_SECONDARY_REGION`, `DB_INSTANCE_CLASS`, `DB_NAME`, `DB_USERNAME`, `DB_SECRET_ARN`, VPC/subnet/security-group IDs, and KMS key ARNs must come from reviewed infrastructure outputs/secrets. Never commit credentials. Before production, validate regional quotas, supported Aurora PostgreSQL engine versions, networking, failover, restore, and connection-pool behavior.

Regional application deployments set `DATABASE_READ_URL` to their nearest regional Aurora reader. The API now routes full-text search and public skill-list reads through `ReadReplicaService`; financial writes, wallet state, exchange transitions, and all transactional decisions remain on the primary `DATABASE_URL`. Leave `DATABASE_READ_URL` blank until the replica is provisioned and replication lag/consistency behavior is tested.
