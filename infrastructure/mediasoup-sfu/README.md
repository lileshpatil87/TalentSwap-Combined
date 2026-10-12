# TalentSwap mediasoup SFU

Standalone SFU service, intentionally outside the pnpm monorepo workspace because mediasoup compiles/downloads native worker binaries and requires separate deployment/network tuning.

- API issues a short-lived HMAC-SHA256 token only after validating the caller against a real exchange participant list.
- API and SFU must share `SFU_SHARED_SECRET` (32+ random characters). Do not expose this secret to the browser.
- Configure `SFU_PUBLIC_URL`, `SFU_CORS_ORIGINS`, `SFU_ANNOUNCED_IP`, and open the configured UDP/TCP media port range on the SFU security group.
- Put the service behind TLS/WSS at a reverse proxy/load balancer. Restrict `/health` exposure as appropriate.
- Clients must first emit `sfu:ensure-router`, then `sfu:join`, and use the acknowledged transport/producer/consumer events. The SFU token expires quickly; call the authenticated API again to refresh it.
- This first deployment is a single-node SFU. Multi-node router placement, Redis-backed peer coordination, TURN fallback, autoscaling, and cross-region media routing require load tests before enabling global group calling.
