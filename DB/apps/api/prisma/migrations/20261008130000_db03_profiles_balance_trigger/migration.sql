-- DB-03 — Profiles + Skill Points Balance Trigger (prompt sequence)
-- The profiles table already exists in the approved DB-02 state. This migration
-- adds the approved trigger function only. The ledger trigger attachment is
-- intentionally deferred until DB-05 creates skill_points_ledger.

CREATE OR REPLACE FUNCTION trg_sync_skill_points()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance INTEGER;
  delta INTEGER;
  expected_balance INTEGER;
BEGIN
  -- The ledger row is immutable and its balance_after is supplied by the
  -- wallet transaction. This trigger validates that snapshot and then
  -- synchronizes the denormalized profile balance in the same transaction.
  SELECT p.skill_points
    INTO current_balance
    FROM profiles AS p
   WHERE p.user_id = NEW.user_id
   FOR UPDATE;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Cannot create ledger entry: profile not found for user %', NEW.user_id;
  END IF;

  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Ledger amount must be a positive integer';
  END IF;

  delta := CASE NEW.entry_type::text
    WHEN 'DEBIT' THEN -NEW.amount
    WHEN 'CREDIT' THEN NEW.amount
    WHEN 'ESCROW_HOLD' THEN -NEW.amount
    WHEN 'ESCROW_RELEASE' THEN NEW.amount
    WHEN 'ADMIN_ADJUSTMENT' THEN NEW.amount
    ELSE NULL
  END;

  IF delta IS NULL THEN
    RAISE EXCEPTION 'Unsupported ledger entry type: %', NEW.entry_type;
  END IF;

  expected_balance := current_balance + delta;

  IF expected_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient SkillPoints for user %: current %, requested delta %',
      NEW.user_id, current_balance, delta;
  END IF;

  IF NEW.balance_after <> expected_balance THEN
    RAISE EXCEPTION 'Invalid balance_after for user %: expected %, supplied %',
      NEW.user_id, expected_balance, NEW.balance_after;
  END IF;

  UPDATE profiles
     SET skill_points = expected_balance
   WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;
