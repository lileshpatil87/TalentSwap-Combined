/**
 * Shared shape for entities carrying standard audit columns
 * (`created_at`/`updated_at`, and — for tables that soft-delete rather
 * than hard-delete, per Technology Specification §8.3's GDPR-anonymise
 * pattern — `deleted_at`). Added per the 2026-08 integration review's
 * cherry-pick recommendation.
 *
 * This is a *type-level* convention only: it does not imply every table
 * has all of these columns (e.g. `admin_logs` is immutable and has no
 * `updated_at`/`deleted_at` — see Technology Specification §4.1.6). A
 * domain module's entity type composes what it actually needs:
 *
 *   export type Skill = AuditedEntity & { id: string; title: string; ... };
 *   export type AdminLog = Pick<AuditedEntity, 'createdAt'> & { id: string; ... };
 *
 * Once `packages/types` exists (FOUND-02), this belongs there instead —
 * it is colocated here only until that package is stood up, same as this
 * app's other `common/` shared shapes.
 */
export interface AuditedEntity {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Variant for tables that never update or soft-delete (e.g. `admin_logs` — an immutable audit log). */
export type CreatedOnlyEntity = Pick<AuditedEntity, 'createdAt'>;
