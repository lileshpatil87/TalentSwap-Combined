#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must point to a disposable PostgreSQL database}"

EMAIL_A="ts-concurrency-a-$$@example.test"
EMAIL_B="ts-concurrency-b-$$@example.test"
cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v email_a="$EMAIL_A" -v email_b="$EMAIL_B" <<'SQL' >/dev/null
DELETE FROM users WHERE email IN (:'email_a', :'email_b');
SQL
}
trap cleanup EXIT

USER_A=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -v email="$EMAIL_A" <<'SQL'
INSERT INTO users(email, password_hash, role, is_email_verified)
VALUES (:'email', 'hash', 'USER', true)
RETURNING id;
SQL
)
USER_B=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -v email="$EMAIL_B" <<'SQL'
INSERT INTO users(email, password_hash, role, is_email_verified)
VALUES (:'email', 'hash', 'USER', true)
RETURNING id;
SQL
)

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v user_id="$USER_A" <<'SQL' >/dev/null
INSERT INTO profiles(user_id, display_name) VALUES (:'user_id', 'Concurrency A');
INSERT INTO skill_points_ledger(user_id, entry_type, amount, balance_after, description)
VALUES (:'user_id', 'CREDIT', 100, 100, 'concurrency setup');
SQL

# Connection A obtains the profile row lock in the trigger, then holds the transaction.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v user_id="$USER_A" <<'SQL' >/tmp/ts-concurrency-a.$$.log 2>&1 &
BEGIN;
INSERT INTO skill_points_ledger(user_id, entry_type, amount, balance_after, description)
VALUES (:'user_id', 'DEBIT', 75, 25, 'concurrent debit A');
SELECT pg_sleep(2);
COMMIT;
SQL
PID_A=$!
sleep 0.3

# Connection B must wait for A's row lock, then fail because the committed balance is only 25.
set +e
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v user_id="$USER_A" <<'SQL' >/tmp/ts-concurrency-b.$$.log 2>&1
BEGIN;
INSERT INTO skill_points_ledger(user_id, entry_type, amount, balance_after, description)
VALUES (:'user_id', 'DEBIT', 75, 25, 'concurrent debit B');
COMMIT;
SQL
STATUS_B=$?
set -e
wait "$PID_A"

if [[ "$STATUS_B" -eq 0 ]]; then
  echo 'FAIL: both concurrent debits succeeded.' >&2
  cat /tmp/ts-concurrency-b.$$.log >&2
  exit 1
fi

FINAL_BALANCE=$(psql "$DATABASE_URL" -At -v ON_ERROR_STOP=1 -v user_id="$USER_A" <<'SQL'
SELECT skill_points FROM profiles WHERE user_id = :'user_id';
SQL
)

if [[ "$FINAL_BALANCE" != "25" ]]; then
  echo "FAIL: expected final balance 25, got $FINAL_BALANCE" >&2
  exit 1
fi

echo 'Concurrency test PASSED: row-level locking serialized the balance updates and prevented a double spend.'
rm -f /tmp/ts-concurrency-a.$$.log /tmp/ts-concurrency-b.$$.log
