# DB-06 — Transactions / Escrow State Machine

Implements the exact transaction fields and status values listed in Specification §4.1.4: participants, skill reference, transaction type, held points, pending→completed/disputed/cancelled states, dual confirmation flags, deadline, unique idempotency key, notes and timestamps.

Critical review remains required by the supplied prompt. The migration adds positive-point, distinct-participant and completed-timestamp consistency checks plus the required query indexes.
