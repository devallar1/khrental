-- Multi-tenant default tenant backfill for MSSQL
-- Sprint 01: backfill only
-- This migration:
--   * creates a default tenant if missing
--   * assigns tenant_id to legacy rows
--   * creates baseline memberships for existing application users

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @DefaultTenantId UNIQUEIDENTIFIER;

    SELECT @DefaultTenantId = id
    FROM dbo.tenants
    WHERE slug = N'default';

    IF @DefaultTenantId IS NULL
    BEGIN
        SET @DefaultTenantId = NEWID();

        INSERT INTO dbo.tenants (
            id,
            name,
            slug,
            status,
            [plan],
            createdat,
            updatedat
        )
        VALUES (
            @DefaultTenantId,
            N'Default Tenant',
            N'default',
            N'active',
            N'legacy',
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.tenant_settings', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM dbo.tenant_settings WHERE tenant_id = @DefaultTenantId
       )
    BEGIN
        INSERT INTO dbo.tenant_settings (
            tenant_id,
            branding_json,
            email_json,
            signature_json,
            storage_json,
            feature_flags_json,
            createdat,
            updatedat
        )
        VALUES (
            @DefaultTenantId,
            N'{"name":"Default Tenant"}',
            NULL,
            NULL,
            NULL,
            NULL,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.app_users', N'U') IS NOT NULL
        UPDATE dbo.app_users SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.properties', N'U') IS NOT NULL
        UPDATE dbo.properties SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.property_units', N'U') IS NOT NULL
        UPDATE dbo.property_units SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
        UPDATE dbo.agreements SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
        UPDATE dbo.agreement_templates SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.invoices', N'U') IS NOT NULL
        UPDATE dbo.invoices SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.payments', N'U') IS NOT NULL
        UPDATE dbo.payments SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.maintenance_requests', N'U') IS NOT NULL
        UPDATE dbo.maintenance_requests SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.maintenance_request_images', N'U') IS NOT NULL
        UPDATE dbo.maintenance_request_images SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.maintenance_request_comments', N'U') IS NOT NULL
        UPDATE dbo.maintenance_request_comments SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.notifications', N'U') IS NOT NULL
        UPDATE dbo.notifications SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.webhook_events', N'U') IS NOT NULL
        UPDATE dbo.webhook_events SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.utility_readings', N'U') IS NOT NULL
        UPDATE dbo.utility_readings SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.utility_configs', N'U') IS NOT NULL
        UPDATE dbo.utility_configs SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.action_records', N'U') IS NOT NULL
        UPDATE dbo.action_records SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.scheduled_tasks', N'U') IS NOT NULL
        UPDATE dbo.scheduled_tasks SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.task_assignments', N'U') IS NOT NULL
        UPDATE dbo.task_assignments SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.letter_templates', N'U') IS NOT NULL
        UPDATE dbo.letter_templates SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.sent_letters', N'U') IS NOT NULL
        UPDATE dbo.sent_letters SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.cameras', N'U') IS NOT NULL
        UPDATE dbo.cameras SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.camera_monitoring', N'U') IS NOT NULL
        UPDATE dbo.camera_monitoring SET tenant_id = @DefaultTenantId WHERE tenant_id IS NULL;

    IF OBJECT_ID(N'dbo.tenant_memberships', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.app_users', N'U') IS NOT NULL
    BEGIN
        INSERT INTO dbo.tenant_memberships (
            id,
            tenant_id,
            app_user_id,
            role,
            status,
            is_default,
            createdat,
            updatedat
        )
        SELECT
            NEWID(),
            @DefaultTenantId,
            au.id,
            COALESCE(NULLIF(au.role, N''), N'staff'),
            N'active',
            1,
            SYSUTCDATETIME(),
            SYSUTCDATETIME()
        FROM dbo.app_users au
        WHERE NOT EXISTS (
            SELECT 1
            FROM dbo.tenant_memberships tm
            WHERE tm.tenant_id = @DefaultTenantId
              AND tm.app_user_id = au.id
        )
        AND (
            au.auth_id IS NOT NULL
            OR COALESCE(au.user_type, N'') <> N'rentee'
        );
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
