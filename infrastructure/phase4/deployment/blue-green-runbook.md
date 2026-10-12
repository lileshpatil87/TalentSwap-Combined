# Blue/green release and 99.9% availability runbook

1. Deploy the new API/web/worker image to the green ECS task set behind the load balancer; keep blue serving traffic.
2. Run `/health` and `/health/ready` checks, database migration compatibility checks, API smoke tests, and a synthetic authenticated journey.
3. Verify worker queue lag, Redis connectivity, database connection saturation, error rate, p95 latency, and 5xx rate for at least 10 minutes.
4. Shift 10% traffic to green; hold and observe. If all gates pass, shift 50%, then 100%. Otherwise shift traffic back to blue.
5. Keep the previous task set and image digest for rollback. Database migrations must follow expand/contract: add compatible schema first, deploy app, backfill, then remove old schema in a later release.
6. Run regional failover drills quarterly and restore drills monthly. Alert on SLO burn rate, not just instance health.

A 99.9% monthly availability objective permits roughly 43.8 minutes of downtime in a 30-day month. It is an objective, not a claim, until SLI telemetry and incident records demonstrate it.
