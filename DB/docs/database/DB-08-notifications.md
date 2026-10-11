# DB-08 — Notifications

Implements the notification entity with recipient, type, JSON payload, read state and creation timestamp. The unread and recent-notification access paths are indexed. Notification delivery, queues, workers and realtime behavior remain outside the database module.
