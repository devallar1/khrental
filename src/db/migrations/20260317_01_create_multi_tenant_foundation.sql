-- Multi-tenant foundation migration for PostgreSQL
-- Sprint 01: schema foundation only
-- This migration is intentionally non-breaking:
--   * creates tenant tables
--   * adds nullable tenant_id columns
--   * adds indexes and foreign keys where safe

BEGIN;

-- ============================================================
-- Create tenants table
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    plan VARCHAR(50),
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenants_slug ON tenants (slug);

-- ============================================================
-- Create tenant_memberships table
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    app_user_id UUID NOT NULL,
    role VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_memberships_tenant_user
    ON tenant_memberships (tenant_id, app_user_id);
CREATE INDEX IF NOT EXISTS ix_tenant_memberships_app_user_id
    ON tenant_memberships (app_user_id);

-- ============================================================
-- Create tenant_settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id UUID NOT NULL PRIMARY KEY,
    branding_json TEXT,
    email_json TEXT,
    signature_json TEXT,
    storage_json TEXT,
    feature_flags_json TEXT,
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Add tenant_id column to all existing tables
-- ============================================================
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'app_users',
        'properties',
        'property_units',
        'agreements',
        'agreement_templates',
        'invoices',
        'payments',
        'maintenance_requests',
        'maintenance_request_images',
        'maintenance_request_comments',
        'notifications',
        'webhook_events',
        'utility_readings',
        'utility_configs',
        'action_records',
        'scheduled_tasks',
        'task_assignments',
        'letter_templates',
        'sent_letters',
        'cameras',
        'camera_monitoring'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id UUID', t);
            END IF;
            -- create index if not exists
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)',
                'ix_' || t || '_tenant_id', t
            );
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- Foreign keys
-- ============================================================
DO $$
BEGIN
    -- FK: tenant_memberships -> tenants
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenant_memberships_tenant'
    ) THEN
        ALTER TABLE tenant_memberships
            ADD CONSTRAINT fk_tenant_memberships_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    END IF;

    -- FK: tenant_memberships -> app_users
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenant_memberships_app_user'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'app_users'
        ) THEN
            ALTER TABLE tenant_memberships
                ADD CONSTRAINT fk_tenant_memberships_app_user
                FOREIGN KEY (app_user_id) REFERENCES app_users(id);
        END IF;
    END IF;

    -- FK: tenant_settings -> tenants
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_tenant_settings_tenant'
    ) THEN
        ALTER TABLE tenant_settings
            ADD CONSTRAINT fk_tenant_settings_tenant
            FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    END IF;
END $$;

COMMIT;
