-- Phase 1 of the ownership-and-management redesign.
--
-- Adds the new tables and columns alongside the existing tenant_id
-- columns. Backfills new state from the old. Nothing reads the new
-- columns/tables yet — Phase 2 will swap the bodies of authz.js to
-- use them, then later phases drop the old columns.
--
-- Net new state after this migration:
--   organizations            ← renamed from `tenants` (with `tenants` view kept
--                              as a backward-compat alias for code that hasn't
--                              been updated yet)
--   org_memberships          ← user ↔ org with role hierarchy
--   property_managers        ← user ↔ property direct grant (Ravi's pattern)
--   permission_audit_log     ← every grant/revoke/transfer logged here
--   properties.owner_user_id / owner_org_id   (one set, the other null)
--   bank_profiles.owner_user_id / owner_org_id (same shape as properties)
--   app_users.is_sysadmin    ← true for old user_type='admin'
--
-- Verification at the bottom raises if backfill is incomplete.

BEGIN;

-- ─── 1. Rename tenants → organizations, keep `tenants` as compat view ────
-- A simple "SELECT * FROM organizations" view is auto-updatable in PG,
-- so existing INSERT INTO tenants / UPDATE tenants / SELECT FROM tenants
-- code keeps working. Phase 4 drops the view.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.tables
		 WHERE table_schema = 'public' AND table_name = 'tenants'
		   AND table_type = 'BASE TABLE'
	) THEN
		ALTER TABLE tenants RENAME TO organizations;
		EXECUTE 'CREATE VIEW tenants AS SELECT * FROM organizations';
	END IF;
END $$;

-- ─── 2. org_memberships ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_memberships (
	user_id    UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
	org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	role       TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'shareholder')),
	granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	granted_by UUID REFERENCES app_users(id),
	PRIMARY KEY (user_id, org_id)
);
CREATE INDEX IF NOT EXISTS ix_org_memberships_org ON org_memberships(org_id);

-- ─── 3. property_managers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_managers (
	user_id     UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
	property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
	granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	granted_by  UUID REFERENCES app_users(id),
	PRIMARY KEY (user_id, property_id)
);
CREATE INDEX IF NOT EXISTS ix_property_managers_property ON property_managers(property_id);

-- ─── 4. permission_audit_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permission_audit_log (
	id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	actor_user_id  UUID REFERENCES app_users(id),
	action         TEXT NOT NULL CHECK (action IN (
		'grant_org_member', 'revoke_org_member', 'change_org_member_role',
		'grant_property_manager', 'revoke_property_manager',
		'transfer_property_owner', 'set_system_role'
	)),
	target_user_id UUID,
	org_id         UUID,
	property_id    UUID,
	details        JSONB,
	created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_audit_actor  ON permission_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_target ON permission_audit_log(target_user_id, created_at DESC);

-- ─── 5. properties.owner_user_id / owner_org_id ──────────────────────────
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'owner_user_id'
	) THEN
		ALTER TABLE properties ADD COLUMN owner_user_id UUID REFERENCES app_users(id);
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'owner_org_id'
	) THEN
		ALTER TABLE properties ADD COLUMN owner_org_id UUID REFERENCES organizations(id);
	END IF;
END $$;

-- Backfill: every existing property → org-owned by its old tenant_id.
UPDATE properties
   SET owner_org_id = tenant_id
 WHERE owner_org_id IS NULL
   AND owner_user_id IS NULL
   AND tenant_id IS NOT NULL;

-- CHECK constraint added AFTER backfill so it doesn't reject existing rows.
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		 WHERE table_name = 'properties' AND constraint_name = 'properties_one_owner_chk'
	) THEN
		ALTER TABLE properties
			ADD CONSTRAINT properties_one_owner_chk
			CHECK (num_nonnulls(owner_user_id, owner_org_id) = 1);
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_properties_owner_user ON properties(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_properties_owner_org  ON properties(owner_org_id)  WHERE owner_org_id  IS NOT NULL;

-- ─── 6. bank_profiles.owner_user_id / owner_org_id ───────────────────────
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'bank_profiles' AND column_name = 'owner_user_id'
	) THEN
		ALTER TABLE bank_profiles ADD COLUMN owner_user_id UUID REFERENCES app_users(id);
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'bank_profiles' AND column_name = 'owner_org_id'
	) THEN
		ALTER TABLE bank_profiles ADD COLUMN owner_org_id UUID REFERENCES organizations(id);
	END IF;
END $$;

UPDATE bank_profiles
   SET owner_org_id = tenant_id
 WHERE owner_org_id IS NULL
   AND owner_user_id IS NULL
   AND tenant_id IS NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints
		 WHERE table_name = 'bank_profiles' AND constraint_name = 'bank_profiles_one_owner_chk'
	) THEN
		ALTER TABLE bank_profiles
			ADD CONSTRAINT bank_profiles_one_owner_chk
			CHECK (num_nonnulls(owner_user_id, owner_org_id) = 1);
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_bank_profiles_owner_user ON bank_profiles(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bank_profiles_owner_org  ON bank_profiles(owner_org_id)  WHERE owner_org_id  IS NOT NULL;

-- ─── 7. app_users.is_sysadmin ────────────────────────────────────────────
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = 'app_users' AND column_name = 'is_sysadmin'
	) THEN
		ALTER TABLE app_users ADD COLUMN is_sysadmin BOOLEAN NOT NULL DEFAULT FALSE;
	END IF;
END $$;

UPDATE app_users
   SET is_sysadmin = TRUE
 WHERE user_type = 'admin'
   AND is_sysadmin = FALSE;

-- ─── 8. Backfill org_memberships from app_users ──────────────────────────
-- Every staff/admin/manager app_user gets a 'member' membership in their
-- current tenant. Roles can be tightened post-migration:
--   UPDATE org_memberships SET role='owner'  WHERE user_id=... AND org_id=...
--   UPDATE org_memberships SET role='admin'  WHERE user_id=... AND org_id=...
--   UPDATE org_memberships SET role='shareholder' ...
INSERT INTO org_memberships (user_id, org_id, role)
SELECT u.id, u.tenant_id, 'member'
  FROM app_users u
 WHERE u.user_type IN ('staff', 'admin', 'manager')
   AND u.tenant_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- ─── 9. Verification — abort the whole migration on any mismatch ─────────
DO $$
DECLARE
	bad INT;
BEGIN
	-- Every property has exactly one owner.
	SELECT COUNT(*) INTO bad FROM properties
	 WHERE num_nonnulls(owner_user_id, owner_org_id) <> 1;
	IF bad > 0 THEN
		RAISE EXCEPTION 'Backfill check: % properties have wrong owner state', bad;
	END IF;

	-- Every bank profile has exactly one owner.
	SELECT COUNT(*) INTO bad FROM bank_profiles
	 WHERE num_nonnulls(owner_user_id, owner_org_id) <> 1;
	IF bad > 0 THEN
		RAISE EXCEPTION 'Backfill check: % bank_profiles have wrong owner state', bad;
	END IF;

	-- Every staff/admin/manager user has at least one org_membership.
	SELECT COUNT(*) INTO bad
	  FROM app_users u
	 WHERE u.user_type IN ('staff', 'admin', 'manager')
	   AND u.tenant_id IS NOT NULL
	   AND NOT EXISTS (
	     SELECT 1 FROM org_memberships m
	      WHERE m.user_id = u.id AND m.org_id = u.tenant_id
	   );
	IF bad > 0 THEN
		RAISE EXCEPTION 'Backfill check: % staff users missing their org_membership', bad;
	END IF;

	-- Every old admin user_type has is_sysadmin = TRUE.
	SELECT COUNT(*) INTO bad FROM app_users
	 WHERE user_type = 'admin' AND is_sysadmin = FALSE;
	IF bad > 0 THEN
		RAISE EXCEPTION 'Backfill check: % admin users missing is_sysadmin=true', bad;
	END IF;
END $$;

COMMIT;
