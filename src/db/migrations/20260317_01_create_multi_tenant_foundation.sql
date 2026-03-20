-- Multi-tenant foundation migration for MSSQL
-- Sprint 01: schema foundation only
-- This migration is intentionally non-breaking:
--   * creates tenant tables
--   * adds nullable tenant_id columns
--   * adds indexes and foreign keys where safe

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.tenants', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.tenants (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_tenants PRIMARY KEY DEFAULT NEWID(),
            name NVARCHAR(200) NOT NULL,
            slug NVARCHAR(200) NOT NULL,
            status NVARCHAR(50) NOT NULL CONSTRAINT DF_tenants_status DEFAULT N'active',
            [plan] NVARCHAR(50) NULL,
            createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_tenants_createdat DEFAULT SYSUTCDATETIME(),
            updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_tenants_updatedat DEFAULT SYSUTCDATETIME()
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'UX_tenants_slug'
          AND object_id = OBJECT_ID(N'dbo.tenants')
    )
    BEGIN
        CREATE UNIQUE INDEX UX_tenants_slug ON dbo.tenants (slug);
    END;

    IF OBJECT_ID(N'dbo.tenant_memberships', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.tenant_memberships (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_tenant_memberships PRIMARY KEY DEFAULT NEWID(),
            tenant_id UNIQUEIDENTIFIER NOT NULL,
            app_user_id UNIQUEIDENTIFIER NOT NULL,
            role NVARCHAR(100) NOT NULL,
            status NVARCHAR(50) NOT NULL CONSTRAINT DF_tenant_memberships_status DEFAULT N'active',
            is_default BIT NOT NULL CONSTRAINT DF_tenant_memberships_is_default DEFAULT 0,
            createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_tenant_memberships_createdat DEFAULT SYSUTCDATETIME(),
            updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_tenant_memberships_updatedat DEFAULT SYSUTCDATETIME()
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'UX_tenant_memberships_tenant_user'
          AND object_id = OBJECT_ID(N'dbo.tenant_memberships')
    )
    BEGIN
        CREATE UNIQUE INDEX UX_tenant_memberships_tenant_user
            ON dbo.tenant_memberships (tenant_id, app_user_id);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = N'IX_tenant_memberships_app_user_id'
          AND object_id = OBJECT_ID(N'dbo.tenant_memberships')
    )
    BEGIN
        CREATE INDEX IX_tenant_memberships_app_user_id
            ON dbo.tenant_memberships (app_user_id);
    END;

    IF OBJECT_ID(N'dbo.tenant_settings', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.tenant_settings (
            tenant_id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_tenant_settings PRIMARY KEY,
            branding_json NVARCHAR(MAX) NULL,
            email_json NVARCHAR(MAX) NULL,
            signature_json NVARCHAR(MAX) NULL,
            storage_json NVARCHAR(MAX) NULL,
            feature_flags_json NVARCHAR(MAX) NULL,
            createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_tenant_settings_createdat DEFAULT SYSUTCDATETIME(),
            updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_tenant_settings_updatedat DEFAULT SYSUTCDATETIME()
        );
    END;

    DECLARE @TenantTables TABLE (table_name SYSNAME);

    INSERT INTO @TenantTables (table_name)
    VALUES
        (N'app_users'),
        (N'properties'),
        (N'property_units'),
        (N'agreements'),
        (N'agreement_templates'),
        (N'invoices'),
        (N'payments'),
        (N'maintenance_requests'),
        (N'maintenance_request_images'),
        (N'maintenance_request_comments'),
        (N'notifications'),
        (N'webhook_events'),
        (N'utility_readings'),
        (N'utility_configs'),
        (N'action_records'),
        (N'scheduled_tasks'),
        (N'task_assignments'),
        (N'letter_templates'),
        (N'sent_letters'),
        (N'cameras'),
        (N'camera_monitoring');

    DECLARE @tableName SYSNAME;
    DECLARE @sql NVARCHAR(MAX);
    DECLARE tenant_cursor CURSOR FAST_FORWARD FOR
        SELECT table_name FROM @TenantTables;

    OPEN tenant_cursor;
    FETCH NEXT FROM tenant_cursor INTO @tableName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF OBJECT_ID(N'dbo.' + @tableName, N'U') IS NOT NULL
           AND COL_LENGTH(N'dbo.' + @tableName, N'tenant_id') IS NULL
        BEGIN
            SET @sql = N'ALTER TABLE dbo.' + QUOTENAME(@tableName) + N' ADD tenant_id UNIQUEIDENTIFIER NULL;';
            EXEC sp_executesql @sql;
        END;

        IF OBJECT_ID(N'dbo.' + @tableName, N'U') IS NOT NULL
           AND NOT EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = N'IX_' + @tableName + N'_tenant_id'
                        AND object_id = OBJECT_ID(N'dbo.' + @tableName)
           )
        BEGIN
            SET @sql = N'CREATE INDEX ' + QUOTENAME(N'IX_' + @tableName + N'_tenant_id') +
                       N' ON dbo.' + QUOTENAME(@tableName) + N' (tenant_id);';
            EXEC sp_executesql @sql;
        END;

        FETCH NEXT FROM tenant_cursor INTO @tableName;
    END;

    CLOSE tenant_cursor;
    DEALLOCATE tenant_cursor;

    IF OBJECT_ID(N'dbo.tenants', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.app_users', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_tenant_memberships_tenant'
       )
    BEGIN
        ALTER TABLE dbo.tenant_memberships
            ADD CONSTRAINT FK_tenant_memberships_tenant
            FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id);
    END;

    IF OBJECT_ID(N'dbo.app_users', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_tenant_memberships_app_user'
       )
    BEGIN
        ALTER TABLE dbo.tenant_memberships
            ADD CONSTRAINT FK_tenant_memberships_app_user
            FOREIGN KEY (app_user_id) REFERENCES dbo.app_users(id);
    END;

    IF OBJECT_ID(N'dbo.tenants', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_tenant_settings_tenant'
       )
    BEGIN
        ALTER TABLE dbo.tenant_settings
            ADD CONSTRAINT FK_tenant_settings_tenant
            FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
