-- Link app_users to auth_user via the existing auth_id column.
-- Sprint: auth-v1. Idempotent; safe to re-run.
--
-- - One auth_user can hold many app_users rows, but at most one per tenant.
-- - Every app_users row must be reachable by some sign-in method (email or phone).

BEGIN;

-- ============================================================
-- Foreign key: app_users.auth_id -> auth_user.id
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_app_users_auth_user'
    ) THEN
        ALTER TABLE app_users
            ADD CONSTRAINT fk_app_users_auth_user
            FOREIGN KEY (auth_id) REFERENCES auth_user("id") ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- Unique (auth_id, tenant_id) — one role per tenant per identity.
-- Partial index so unbound app_users rows (auth_id IS NULL or tenant_id IS NULL)
-- don't all collide on a single (NULL, NULL) tuple.
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS ux_app_users_auth_id_tenant_id
    ON app_users (auth_id, tenant_id)
    WHERE auth_id IS NOT NULL AND tenant_id IS NOT NULL;

-- ============================================================
-- Lookup index for the hooks.server.js post-auth query:
--   SELECT * FROM app_users WHERE auth_id = $1 AND tenant_id = $2
-- The unique partial index above already covers this, but keep an
-- explicit non-unique index in case auth_id is queried alone.
-- ============================================================
CREATE INDEX IF NOT EXISTS ix_app_users_auth_id ON app_users (auth_id);

COMMIT;
