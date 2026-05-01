-- Phase 4.5 — rename `rentees` → `tenants`.
--
-- The post-Phase-4 schema has no `tenants` (the SaaS-meaning "tenant"
-- table was renamed to `organizations` in Phase 1, the compat view was
-- dropped in Phase 4). The name is free for the renter-meaning of
-- "tenant" — which is industry standard for property management.
--
-- Renames:
--   rentees                     → tenants
--   rentees.tenant_id           → tenants.org_id  (clarity — the row
--                                  IS the tenant; the column points at
--                                  the operator org)
--   agreements.renteeid          → agreements.tenant_id
--   invoices.renteeid            → invoices.tenant_id
--   action_records.renteeid      → action_records.tenant_id
--   sent_letters.renteeid        → sent_letters.tenant_id
--   utility_readings.renteeid    → utility_readings.tenant_id
--   maintenance_requests.renteeid → maintenance_requests.tenant_id
--
-- Indexes / FK constraint names follow column renames where helpful;
-- PG propagates the column-ref change in indexes/constraints
-- automatically, but the names are renamed for readability.

BEGIN;

ALTER TABLE rentees RENAME TO tenants;
ALTER TABLE tenants RENAME COLUMN tenant_id TO org_id;

-- The four secondary tables still have legacy tenant_id columns
-- (Phase 4 only dropped from properties/agreements/invoices/etc.).
-- Drop them here so the renteeid → tenant_id rename below doesn't
-- collide. All four tables are empty.
ALTER TABLE action_records       DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE sent_letters         DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE utility_readings     DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS tenant_id;

-- Renter-FK columns on six tables → tenant_id.
ALTER TABLE agreements           RENAME COLUMN renteeid TO tenant_id;
ALTER TABLE invoices             RENAME COLUMN renteeid TO tenant_id;
ALTER TABLE action_records       RENAME COLUMN renteeid TO tenant_id;
ALTER TABLE sent_letters         RENAME COLUMN renteeid TO tenant_id;
ALTER TABLE utility_readings     RENAME COLUMN renteeid TO tenant_id;
ALTER TABLE maintenance_requests RENAME COLUMN renteeid TO tenant_id;

-- Index renames for clarity (column refs auto-update on rename).
ALTER INDEX IF EXISTS ix_rentees_auth_id            RENAME TO ix_tenants_auth_id;
ALTER INDEX IF EXISTS ix_rentees_tenant_id          RENAME TO ix_tenants_org_id;
ALTER INDEX IF EXISTS ux_rentees_auth_id_tenant_id  RENAME TO ux_tenants_auth_id_org_id;

-- FK constraint names for the renamed renter-FK columns.
ALTER TABLE agreements           RENAME CONSTRAINT agreements_renteeid_fkey         TO agreements_tenant_id_fkey;
ALTER TABLE invoices             RENAME CONSTRAINT invoices_renteeid_fkey           TO invoices_tenant_id_fkey;
ALTER TABLE action_records       RENAME CONSTRAINT action_records_renteeid_fkey     TO action_records_tenant_id_fkey;
ALTER TABLE sent_letters         RENAME CONSTRAINT sent_letters_renteeid_fkey       TO sent_letters_tenant_id_fkey;
ALTER TABLE utility_readings     RENAME CONSTRAINT utility_readings_renteeid_fkey   TO utility_readings_tenant_id_fkey;
ALTER TABLE maintenance_requests RENAME CONSTRAINT maintenance_requests_renteeid_fkey TO maintenance_requests_tenant_id_fkey;

-- Verification.
DO $$
DECLARE
	bad INT;
BEGIN
	SELECT COUNT(*) INTO bad FROM information_schema.tables
	 WHERE table_schema = 'public' AND table_name = 'rentees';
	IF bad > 0 THEN RAISE EXCEPTION 'Phase 4.5 check: rentees table still exists'; END IF;

	SELECT COUNT(*) INTO bad FROM information_schema.tables
	 WHERE table_schema = 'public' AND table_name = 'tenants' AND table_type = 'BASE TABLE';
	IF bad <> 1 THEN RAISE EXCEPTION 'Phase 4.5 check: tenants base table missing'; END IF;

	SELECT COUNT(*) INTO bad FROM information_schema.columns
	 WHERE table_schema = 'public' AND column_name = 'renteeid';
	IF bad > 0 THEN RAISE EXCEPTION 'Phase 4.5 check: % renteeid columns still exist', bad; END IF;
END $$;

COMMIT;
