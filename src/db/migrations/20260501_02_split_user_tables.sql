-- Phase 3.5 — split rentees and vendors into their own tables.
--
-- Security goal: shrink the staff blast radius. The rentee-side attack
-- surface is much larger (public portal, phone OTP) so isolation matters
-- — a compromised rentee account shouldn't be one column-flip away from
-- staff context. Vendors (lawyers, auditors, plumbers) are a third
-- population with a different lifecycle (temporary, scoped) and belong
-- in their own table for the same reason.
--
-- After this migration:
--   app_users   contains only staff/admin/manager rows
--   rentees     contains all rentees (moved out)
--   vendors     new, empty until vendors are onboarded
--   vendor_grants, vendor_notes  new, supporting tables
--
-- FK fan-out: columns that ARE rentees (renteeid in agreements/invoices/
-- etc.) are re-pointed at rentees(id). Columns that ARE staff (owner_user_id
-- on properties/bank_profiles, org_memberships, property_managers, etc.)
-- stay pointing at app_users — they're correct already, app_users will
-- be staff-only once the rentee rows are moved out.
--
-- Mixed-population columns (notifications.user_id, mr_comments.user_id,
-- mr_images.uploaded_by) drop their FK and become bare UUID columns. The
-- application can resolve to staff_users/rentees/vendors as needed; we
-- don't constrain at the DB level since the author could be any of three.

BEGIN;

-- ─── 1. Rentees ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rentees (
	id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	auth_id                 UUID REFERENCES auth_user(id) ON DELETE SET NULL,
	email                   VARCHAR(255),
	name                    VARCHAR(255),
	contact_details         JSONB,
	status                  VARCHAR(50),
	active                  BOOLEAN DEFAULT TRUE,
	last_login              TIMESTAMPTZ,
	invited                 BOOLEAN DEFAULT FALSE,
	national_id             VARCHAR(100),
	permanent_address       TEXT,
	id_copy_url             TEXT,
	notes                   TEXT,
	associated_property_ids UUID[],
	tenant_id               UUID REFERENCES organizations(id),
	createdat               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updatedat               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_rentees_auth_id   ON rentees(auth_id);
CREATE INDEX IF NOT EXISTS ix_rentees_tenant_id ON rentees(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_rentees_auth_id_tenant_id
	ON rentees(auth_id, tenant_id)
	WHERE auth_id IS NOT NULL AND tenant_id IS NOT NULL;

-- ─── 2. Vendors ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
	id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	auth_id         UUID REFERENCES auth_user(id) ON DELETE SET NULL,
	email           VARCHAR(255),
	name            VARCHAR(255),
	contact_details JSONB,
	company         VARCHAR(255),       -- e.g. "Acme Plumbing", "Fonseka & Sons"
	category        VARCHAR(100),       -- informational: 'Lawyer', 'Auditor', 'Plumber', etc.
	notes           TEXT,
	active          BOOLEAN NOT NULL DEFAULT TRUE,
	createdat       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updatedat       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_vendors_auth_id ON vendors(auth_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_vendors_auth_id
	ON vendors(auth_id) WHERE auth_id IS NOT NULL;

-- ─── 3. Vendor grants and notes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_grants (
	id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	vendor_id     UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
	-- exactly one anchor set:
	property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
	org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
	scope         TEXT[] NOT NULL,        -- ['plumbing'], ['deed','audit'], etc.
	can_add_notes BOOLEAN NOT NULL DEFAULT TRUE,
	granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	granted_by    UUID REFERENCES app_users(id),
	expires_at    TIMESTAMPTZ NOT NULL,
	revoked_at    TIMESTAMPTZ,
	CHECK (num_nonnulls(property_id, org_id) = 1)
);
CREATE INDEX IF NOT EXISTS ix_vendor_grants_vendor   ON vendor_grants(vendor_id);
CREATE INDEX IF NOT EXISTS ix_vendor_grants_property ON vendor_grants(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_vendor_grants_org      ON vendor_grants(org_id)      WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_vendor_grants_active   ON vendor_grants(vendor_id, expires_at)
	WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS vendor_notes (
	id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
	property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
	body        TEXT NOT NULL,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_vendor_notes_vendor_property
	ON vendor_notes(vendor_id, property_id);

-- ─── 4. Move rentee rows from app_users → rentees ────────────────────────
-- Preserves IDs so existing FK values stay valid after we re-point them.
INSERT INTO rentees (
	id, auth_id, email, name, contact_details, status, active, last_login,
	invited, national_id, permanent_address, id_copy_url, notes,
	associated_property_ids, tenant_id, createdat, updatedat
)
SELECT
	id, auth_id, email, name, contact_details, status, active, last_login,
	invited, national_id, permanent_address, id_copy_url, notes,
	associated_property_ids, tenant_id, createdat, updatedat
  FROM app_users
 WHERE user_type = 'rentee'
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Re-point rentee FKs from app_users → rentees ─────────────────────
-- All target tables are empty today (verified via row counts pre-migration),
-- so dropping and re-adding the constraints is safe.

-- agreements.renteeid (had two FK constraints — drop both)
ALTER TABLE agreements DROP CONSTRAINT IF EXISTS agreements_renteeid_fkey;
ALTER TABLE agreements DROP CONSTRAINT IF EXISTS fk_agreements_rentee;
ALTER TABLE agreements ADD CONSTRAINT agreements_renteeid_fkey
	FOREIGN KEY (renteeid) REFERENCES rentees(id);

-- invoices.renteeid (also had two)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_renteeid_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_rentee;
ALTER TABLE invoices ADD CONSTRAINT invoices_renteeid_fkey
	FOREIGN KEY (renteeid) REFERENCES rentees(id);

-- action_records.renteeid
ALTER TABLE action_records DROP CONSTRAINT IF EXISTS action_records_renteeid_fkey;
ALTER TABLE action_records ADD CONSTRAINT action_records_renteeid_fkey
	FOREIGN KEY (renteeid) REFERENCES rentees(id);

-- sent_letters.renteeid
ALTER TABLE sent_letters DROP CONSTRAINT IF EXISTS sent_letters_renteeid_fkey;
ALTER TABLE sent_letters ADD CONSTRAINT sent_letters_renteeid_fkey
	FOREIGN KEY (renteeid) REFERENCES rentees(id);

-- utility_readings.renteeid
ALTER TABLE utility_readings DROP CONSTRAINT IF EXISTS utility_readings_renteeid_fkey;
ALTER TABLE utility_readings ADD CONSTRAINT utility_readings_renteeid_fkey
	FOREIGN KEY (renteeid) REFERENCES rentees(id);

-- maintenance_requests.renteeid
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_renteeid_fkey;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_renteeid_fkey
	FOREIGN KEY (renteeid) REFERENCES rentees(id);

-- ─── 6. Drop FKs on mixed-population columns ─────────────────────────────
-- These columns can be authored by any of staff/rentee/vendor, so a
-- single FK target doesn't fit. Application code resolves via auth_id
-- when needed. (All target tables are empty today.)
ALTER TABLE notifications                DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE maintenance_request_comments DROP CONSTRAINT IF EXISTS maintenance_request_comments_user_id_fkey;
ALTER TABLE maintenance_request_images   DROP CONSTRAINT IF EXISTS maintenance_request_images_uploaded_by_fkey;

-- ─── 7. Remove rentee rows from app_users ────────────────────────────────
DELETE FROM app_users WHERE user_type = 'rentee';

-- ─── 8. Verification ─────────────────────────────────────────────────────
DO $$
DECLARE
	bad INT;
	rentees_in_app_users INT;
	rentees_in_rentees INT;
BEGIN
	-- app_users should no longer contain rentees.
	SELECT COUNT(*) INTO rentees_in_app_users FROM app_users WHERE user_type = 'rentee';
	IF rentees_in_app_users > 0 THEN
		RAISE EXCEPTION 'Split check: % rentee rows still in app_users', rentees_in_app_users;
	END IF;

	-- rentees table has all of them.
	SELECT COUNT(*) INTO rentees_in_rentees FROM rentees;
	IF rentees_in_rentees = 0 THEN
		RAISE NOTICE 'Split check: rentees table is empty (no rentees existed pre-migration)';
	END IF;

	-- Sanity: agreements.renteeid points at rentees(id) — every non-null
	-- value should resolve.
	SELECT COUNT(*) INTO bad FROM agreements a
	 WHERE a.renteeid IS NOT NULL
	   AND NOT EXISTS (SELECT 1 FROM rentees r WHERE r.id = a.renteeid);
	IF bad > 0 THEN
		RAISE EXCEPTION 'Split check: % agreements.renteeid orphan after re-point', bad;
	END IF;

	SELECT COUNT(*) INTO bad FROM invoices i
	 WHERE i.renteeid IS NOT NULL
	   AND NOT EXISTS (SELECT 1 FROM rentees r WHERE r.id = i.renteeid);
	IF bad > 0 THEN
		RAISE EXCEPTION 'Split check: % invoices.renteeid orphan after re-point', bad;
	END IF;
END $$;

COMMIT;
