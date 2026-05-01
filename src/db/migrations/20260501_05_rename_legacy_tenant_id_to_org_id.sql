-- Cosmetic cleanup — rename the last two `tenant_id` columns that
-- legitimately point at organizations (the operator-org meaning of
-- "tenant"). After Phase 4.5, the word "tenant" everywhere else means
-- the renter; these survivors are confusing without a rename.
--
--   app_users.tenant_id          → app_users.org_id
--   agreement_templates.tenant_id → agreement_templates.org_id

BEGIN;

ALTER TABLE app_users           RENAME COLUMN tenant_id TO org_id;
ALTER TABLE agreement_templates RENAME COLUMN tenant_id TO org_id;

-- Index name follows.
ALTER INDEX IF EXISTS ix_app_users_tenant_id RENAME TO ix_app_users_org_id;

DO $$
DECLARE
	bad INT;
BEGIN
	SELECT COUNT(*) INTO bad FROM information_schema.columns
	 WHERE table_schema = 'public'
	   AND column_name = 'tenant_id'
	   AND table_name IN ('app_users', 'agreement_templates');
	IF bad > 0 THEN
		RAISE EXCEPTION 'Cosmetic rename check: % tenant_id columns still on app_users/agreement_templates', bad;
	END IF;
END $$;

COMMIT;
