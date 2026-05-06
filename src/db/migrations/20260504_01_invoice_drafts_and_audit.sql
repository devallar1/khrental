-- Invoice draft / lock workflow + audit log.
--
-- Until now `invoices.status` has only carried lifecycle states tied to
-- payment ('pending', 'paid', 'overdue', 'cancelled'). This migration
-- introduces an authoring lifecycle that runs *before* an invoice is
-- considered issued:
--
--   draft  → editable freely, not yet shown to the rentee, no PDF print
--   locked → committed; PDF/print enabled; further edits require an
--            explicit unlock action (which is logged)
--
-- Existing rows (status = 'pending'/'paid'/...) are treated as already
-- locked — they were created by code paths that inserted the invoice
-- in one shot. We don't backfill `status='locked'` because downstream
-- code reads the existing values; instead, the UI treats anything that
-- isn't 'draft' as "locked-or-later".
--
-- The audit table records the authoring lifecycle (create / edit /
-- lock / unlock) for each invoice, with a JSONB snapshot of the row at
-- that moment. The detail page reads this to show a history.

BEGIN;

-- ─── 1. Lock metadata on invoices ──────────────────────────────────────
ALTER TABLE invoices
	ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS locked_by UUID;

-- ─── 2. Audit log table ────────────────────────────────────────────────
-- Append-only history of authoring events on an invoice.
--
-- action values: 'created' | 'edited' | 'locked' | 'unlocked' | 'deleted'
--
-- snapshot stores the relevant row fields at the time of the event:
--   { components, totalamount, notes, status, billingperiod, duedate, currency }
-- so the UI can compute diffs between successive events without a
-- separate before/after column.
CREATE TABLE IF NOT EXISTS invoice_audit_log (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
	user_id     UUID,
	action      TEXT NOT NULL,
	snapshot    JSONB,
	note        TEXT,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_invoice_audit_log_invoice
	ON invoice_audit_log(invoice_id, created_at DESC);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'invoice_audit_log_action_check'
	) THEN
		ALTER TABLE invoice_audit_log
			ADD CONSTRAINT invoice_audit_log_action_check
			CHECK (action IN ('created', 'edited', 'locked', 'unlocked', 'deleted'));
	END IF;
END $$;

COMMIT;
