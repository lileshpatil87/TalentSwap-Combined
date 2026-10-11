# DB-05 — Skill Points Ledger

## Status
Implementation-ready-for-review; this is a critical financial-integrity module and requires the dual approval specified by the prompt (Erwin + Lilesh).

## Design
`skill_points_ledger` is append-only by project contract and is the authoritative SkillPoints record. `trg_sync_skill_points` runs **AFTER INSERT**. It locks the profile, computes the signed delta, validates the immutable `balance_after` snapshot supplied by the wallet transaction, and synchronizes `profiles.skill_points` atomically. This preserves the constitution's single approved trigger and append-only ledger contract.

## Entry semantics
- DEBIT: subtract amount
- CREDIT: add amount
- ESCROW_HOLD: subtract amount
- ESCROW_RELEASE: add amount
- ADMIN_ADJUSTMENT: add amount (the governing specification does not define a signed admin-adjustment representation)

## Integrity
Positive amount, non-negative balance snapshot, user FK, optional transaction FK, chronological user index.

## Known review point
The supplied specification does not define a separate idempotency key or paired ledger-row schema. No speculative field was added.
