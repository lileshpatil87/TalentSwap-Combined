# TalentSwap Worker

The worker is backend-only and consumes the established BullMQ queues from the API.

Processors:

- `document-scan` — private-object download via a short-lived signed URL + ClamAV INSTREAM scanning.
- `notifications` — durable notification persistence + Redis pub/sub delivery after commit.
- `gamification` — XP/level/badge updates with durable job receipts.
- `search-sync` — derived PostgreSQL FTS projection synchronization/rebuild.
- `skill-embeddings` — OpenAI embedding generation with retries and pgvector persistence.

All processors are retry-safe and isolated from HTTP request lifecycles. Queue retry/backoff defaults are configured centrally in the API `QueueService`.
