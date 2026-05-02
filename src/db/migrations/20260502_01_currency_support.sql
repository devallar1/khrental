-- Multi-currency support — money-bearing rows carry an explicit ISO-4217
-- code, transaction records (invoices, payments) snapshot an FX rate to
-- the org's reporting currency at the time of the transaction so reports
-- stay stable when rates move later.
--
-- Defaults: every existing row is 'LKR' (status quo); fx_rate_to_lkr
-- defaults to 1.0 (LKR-on-LKR is a no-op). Once a non-LKR agreement
-- is onboarded, populate fx_rates and the invoice action will look up
-- the rate at generation time.

BEGIN;

-- ─── 1. fx_rates table ──────────────────────────────────────────────────
-- Daily snapshot of one currency in terms of another. Manual entries are
-- fine for now; an automated fetcher can land later writing into this
-- same table. Lookup at transaction time stamps the rate onto the
-- transaction row so historical reports don't change.
CREATE TABLE IF NOT EXISTS fx_rates (
	base_currency  CHAR(3) NOT NULL,
	quote_currency CHAR(3) NOT NULL,
	as_of_date     DATE    NOT NULL DEFAULT CURRENT_DATE,
	rate           NUMERIC(18, 8) NOT NULL,
	source         TEXT,
	createdat      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (base_currency, quote_currency, as_of_date)
);

-- LKR-to-LKR is the trivial pair; seed it so lookups for the all-LKR
-- world resolve cleanly without special-casing.
INSERT INTO fx_rates (base_currency, quote_currency, as_of_date, rate, source)
VALUES ('LKR', 'LKR', CURRENT_DATE, 1.0, 'identity')
ON CONFLICT DO NOTHING;

-- ─── 2. Org-level reporting currency ────────────────────────────────────
ALTER TABLE organizations
	ADD COLUMN IF NOT EXISTS reporting_currency CHAR(3) NOT NULL DEFAULT 'LKR';

-- ─── 3. Currency on money-bearing tables ────────────────────────────────
-- Pattern: ADD COLUMN IF NOT EXISTS, NOT NULL, DEFAULT 'LKR'. Existing
-- rows get backfilled by the default; new rows pick up the default
-- unless overridden.
ALTER TABLE bank_profiles    ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'LKR';
ALTER TABLE properties       ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'LKR';
ALTER TABLE property_units   ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'LKR';
ALTER TABLE agreements       ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'LKR';
ALTER TABLE invoices         ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'LKR';
ALTER TABLE payments         ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'LKR';

-- ─── 4. FX-rate snapshots on transaction rows ───────────────────────────
-- The org's reporting currency at TX time is "to_currency"; we always
-- snapshot to_LKR for now (single supported reporting currency) so the
-- field name reflects that intent. When/if multi-reporting-currency
-- lands, this becomes a join through reporting_currency.
ALTER TABLE invoices
	ADD COLUMN IF NOT EXISTS fx_rate_to_lkr NUMERIC(18, 8) NOT NULL DEFAULT 1.0;
ALTER TABLE payments
	ADD COLUMN IF NOT EXISTS fx_rate_to_lkr NUMERIC(18, 8) NOT NULL DEFAULT 1.0;

-- ─── 5. CHECK constraints — ISO-4217 alpha codes are 3 uppercase letters
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		 WHERE table_name = 'invoices' AND constraint_name = 'invoices_currency_iso4217'
	) THEN
		ALTER TABLE invoices       ADD CONSTRAINT invoices_currency_iso4217       CHECK (currency ~ '^[A-Z]{3}$');
		ALTER TABLE bank_profiles  ADD CONSTRAINT bank_profiles_currency_iso4217  CHECK (currency ~ '^[A-Z]{3}$');
		ALTER TABLE properties     ADD CONSTRAINT properties_currency_iso4217     CHECK (currency ~ '^[A-Z]{3}$');
		ALTER TABLE property_units ADD CONSTRAINT property_units_currency_iso4217 CHECK (currency ~ '^[A-Z]{3}$');
		ALTER TABLE agreements     ADD CONSTRAINT agreements_currency_iso4217     CHECK (currency ~ '^[A-Z]{3}$');
		ALTER TABLE payments       ADD CONSTRAINT payments_currency_iso4217       CHECK (currency ~ '^[A-Z]{3}$');
		ALTER TABLE organizations  ADD CONSTRAINT organizations_reporting_currency_iso4217
			CHECK (reporting_currency ~ '^[A-Z]{3}$');
	END IF;
END $$;

-- ─── 6. Verification ────────────────────────────────────────────────────
DO $$
DECLARE
	bad INT;
BEGIN
	SELECT COUNT(*) INTO bad
	  FROM information_schema.columns
	 WHERE table_schema = 'public' AND column_name = 'currency'
	   AND table_name IN ('bank_profiles','properties','property_units','agreements','invoices','payments');
	IF bad <> 6 THEN
		RAISE EXCEPTION 'Currency check: % of 6 expected currency columns present', bad;
	END IF;
END $$;

COMMIT;
