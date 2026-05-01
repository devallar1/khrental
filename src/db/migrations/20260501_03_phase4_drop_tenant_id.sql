-- Phase 4 — drop legacy tenant_id columns from entity tables.
--
-- Access to all of these is now derivable from a parent (mostly through
-- properties.owner_org_id / owner_user_id, which Phase 1 added). The
-- authz module no longer reads any of these columns; routes have been
-- updated to filter via the new ownership signals instead.
--
-- Also drops the `tenants` backward-compat view (kept since Phase 1 to
-- ease incremental updates of FROM tenants → FROM organizations) and
-- the (auth_id, tenant_id) unique partial index on app_users
-- (replaced by a global unique on auth_id since one auth identity =
-- one staff_users row).
--
-- Tables that KEEP their tenant_id (renamed to org_id in Phase 4.5):
--   rentees, agreement_templates, app_users
--   — these legitimately denote "the org context for this entity"
--   and the rename pass turns them into proper org_id columns.

BEGIN;

-- ─── 1. Drop the tenants compat view ────────────────────────────────────
DROP VIEW IF EXISTS tenants;

-- ─── 2. Drop tenant_id from entity tables ───────────────────────────────
-- properties: ownership lives in owner_user_id / owner_org_id (Phase 1).
ALTER TABLE properties     DROP COLUMN IF EXISTS tenant_id;

-- bank_profiles: ownership lives in owner_user_id / owner_org_id (Phase 1).
-- Drop the old unique index that included tenant_id; ownership-scoped
-- uniqueness is on (coalesce(owner ids), account_number).
DROP INDEX IF EXISTS ux_bank_profiles_tenant_account;
ALTER TABLE bank_profiles  DROP COLUMN IF EXISTS tenant_id;
CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_profiles_owner_account
	ON bank_profiles (
		(COALESCE(owner_user_id::text, '') || '|' || COALESCE(owner_org_id::text, '')),
		account_number
	);

-- agreements / invoices / property_units: derivable via property.
ALTER TABLE agreements     DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE invoices       DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE property_units DROP COLUMN IF EXISTS tenant_id;

-- ─── 3. app_users index reshape ─────────────────────────────────────────
-- The unique partial index (auth_id, tenant_id) was about "one app_user
-- role per identity per tenant". Post-split, app_users contains only
-- staff and one identity = one staff row, so a global unique on auth_id
-- is the right shape.
DROP INDEX IF EXISTS ux_app_users_auth_id_tenant_id;
CREATE UNIQUE INDEX IF NOT EXISTS ux_app_users_auth_id
	ON app_users (auth_id) WHERE auth_id IS NOT NULL;

-- ─── 4. Verification ────────────────────────────────────────────────────
DO $$
DECLARE
	bad INT;
BEGIN
	-- No tenant_id column should remain on the dropped tables.
	SELECT COUNT(*) INTO bad
	  FROM information_schema.columns
	 WHERE table_schema = 'public'
	   AND column_name = 'tenant_id'
	   AND table_name IN ('properties','bank_profiles','agreements','invoices','property_units');
	IF bad > 0 THEN
		RAISE EXCEPTION 'Phase 4 check: % tenant_id columns still present on entity tables', bad;
	END IF;

	-- The tenants view should be gone.
	SELECT COUNT(*) INTO bad
	  FROM information_schema.tables
	 WHERE table_schema = 'public' AND table_name = 'tenants' AND table_type = 'VIEW';
	IF bad > 0 THEN
		RAISE EXCEPTION 'Phase 4 check: tenants view still exists';
	END IF;
END $$;

COMMIT;
