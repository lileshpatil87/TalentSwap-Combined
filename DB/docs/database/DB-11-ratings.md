# DB-11 — Ratings

Implements rater/ratee relationships, transaction reference, 1–5 rating validation, optional feedback and timestamps. `(transaction_id, rater_id)` prevents duplicate ratings by the same user for the same transaction.
