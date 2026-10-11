# DB-03 — Profiles + Skill Points Balance Trigger

## Scope
Executed from the supplied DB-03 prompt. The approved DB-02 state already contained `profiles`, including `skill_points` and its non-negative CHECK constraint. DB-03 therefore adds the missing database trigger function without duplicating the table.

## Implementation
- `trg_sync_skill_points()` is created in `20261008130000_db03_profiles_balance_trigger`.
- The function locks the user's profile row, calculates the ledger delta, rejects invalid/negative balances, validates the immutable `balance_after` snapshot, and updates `profiles.skill_points`.
- The trigger is attached only after `skill_points_ledger` exists in DB-05.

## Invariants
- `profiles.skill_points >= 0`.
- Ledger amount must be positive.
- The ledger is the source of truth; profile balance is a denormalized projection.
- No application-level balance synchronization is introduced.

## Validation
Static migration/schema review completed. Live PostgreSQL migration and trigger tests require a PostgreSQL instance, which is not available in the supplied execution environment.
