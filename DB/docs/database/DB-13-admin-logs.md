# DB-13 — Admin Logs / Immutable Audit

Implements the canonical admin audit fields: administrator, action, target type/id, JSON metadata and creation timestamp. The ratified database constitution treats this table as append-only and identifies `trg_sync_skill_points` as the sole approved database trigger; therefore the migration revokes UPDATE/DELETE/TRUNCATE from PUBLIC and leaves exact deployment-role grants to infrastructure.

This environment cannot verify role-based immutability without a live PostgreSQL role configuration; that remains an explicit deployment validation item.
