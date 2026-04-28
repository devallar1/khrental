-- Multi-tenant default tenant backfill for PostgreSQL
-- Sprint 01: backfill only
-- This migration:
--   * creates a default tenant if missing
--   * assigns tenant_id to legacy rows
--   * creates baseline memberships for existing application users

BEGIN;

DO $$
DECLARE
    v_default_tenant_id UUID;
BEGIN
    -- Check if default tenant already exists
    SELECT id INTO v_default_tenant_id
    FROM tenants
    WHERE slug = 'default';

    -- Create default tenant if not found
    IF v_default_tenant_id IS NULL THEN
        v_default_tenant_id := gen_random_uuid();

        INSERT INTO tenants (id, name, slug, status, plan, createdat, updatedat)
        VALUES (
            v_default_tenant_id,
            'Default Tenant',
            'default',
            'active',
            'legacy',
            NOW(),
            NOW()
        );
    END IF;

    -- Insert default tenant settings if missing
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tenant_settings'
    ) THEN
        INSERT INTO tenant_settings (tenant_id, branding_json, createdat, updatedat)
        SELECT v_default_tenant_id, '{"name":"Default Tenant"}', NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM tenant_settings WHERE tenant_id = v_default_tenant_id
        );
    END IF;

    -- Backfill tenant_id on all tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users') THEN
        UPDATE app_users SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
        UPDATE properties SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_units') THEN
        UPDATE property_units SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreements') THEN
        UPDATE agreements SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreement_templates') THEN
        UPDATE agreement_templates SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        UPDATE invoices SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        UPDATE payments SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_requests') THEN
        UPDATE maintenance_requests SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_request_images') THEN
        UPDATE maintenance_request_images SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_request_comments') THEN
        UPDATE maintenance_request_comments SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        UPDATE notifications SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhook_events') THEN
        UPDATE webhook_events SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'utility_readings') THEN
        UPDATE utility_readings SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'utility_configs') THEN
        UPDATE utility_configs SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_records') THEN
        UPDATE action_records SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_tasks') THEN
        UPDATE scheduled_tasks SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_assignments') THEN
        UPDATE task_assignments SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'letter_templates') THEN
        UPDATE letter_templates SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sent_letters') THEN
        UPDATE sent_letters SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cameras') THEN
        UPDATE cameras SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'camera_monitoring') THEN
        UPDATE camera_monitoring SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- Create tenant memberships for existing app_users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_memberships')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users')
    THEN
        INSERT INTO tenant_memberships (
            id, tenant_id, app_user_id, role, status, is_default, createdat, updatedat
        )
        SELECT
            gen_random_uuid(),
            v_default_tenant_id,
            au.id,
            COALESCE(NULLIF(au.role, ''), 'staff'),
            'active',
            TRUE,
            NOW(),
            NOW()
        FROM app_users au
        WHERE NOT EXISTS (
            SELECT 1
            FROM tenant_memberships tm
            WHERE tm.tenant_id = v_default_tenant_id
              AND tm.app_user_id = au.id
        )
        AND (
            au.auth_id IS NOT NULL
            OR COALESCE(au.user_type, '') <> 'rentee'
        );
    END IF;
END $$;

COMMIT;
