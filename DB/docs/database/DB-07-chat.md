# DB-07 — Conversations + Messages

Implements `conversations` with UUID participant arrays and `messages` with conversation/sender references, text content, soft-delete flag and send timestamp. Message pagination uses `(conversation_id, sent_at)`. No Socket.io, notification or service implementation is included.
