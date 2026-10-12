-- Persist every field exposed by the editable profile form.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS headline VARCHAR(120),
  ADD COLUMN IF NOT EXISTS availability VARCHAR(120),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(80),
  ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Use a monotonic ledger sequence for balance ordering. `created_at` can be
-- identical for multiple entries created inside one transaction, while UUIDs
-- are random and therefore cannot establish ledger order.
ALTER TABLE skill_points_ledger ADD COLUMN IF NOT EXISTS sequence BIGSERIAL;
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS row_number
  FROM skill_points_ledger
)
UPDATE skill_points_ledger AS ledger
SET sequence = ordered.row_number
FROM ordered
WHERE ledger.id = ordered.id;
SELECT setval(
  pg_get_serial_sequence('skill_points_ledger', 'sequence'),
  COALESCE((SELECT MAX(sequence) FROM skill_points_ledger), 0) + 1,
  false
);
CREATE UNIQUE INDEX IF NOT EXISTS skill_points_ledger_sequence_key ON skill_points_ledger(sequence);
CREATE INDEX IF NOT EXISTS skill_points_ledger_user_sequence_idx ON skill_points_ledger(user_id, sequence DESC);
