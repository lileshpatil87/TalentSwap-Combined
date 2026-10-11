# Prompt Sequence Reconciliation

The supplied `DB Prompts.pdf` explicitly instructs execution as DB-03 through DB-17, beginning with Profiles + Balance Trigger and ending with the final performance pass.

The repository's older `TalentSwap_Master_Development_Plan.md` and `DB-CON-v1.0_Database_Constitution.md` use a different historical numbering matrix (for example, DB-03=skills and DB-04=ledger). The supplied prompt document is treated as the requested execution sequence for this delivery. The governing source files themselves are not rewritten.

The existing ZIP already contains users/auth/profiles in the DB-02 migration. Therefore DB-03 preserves that approved table and adds the missing trigger function rather than duplicating the table.

This discrepancy is recorded explicitly to prevent silent architecture drift.
