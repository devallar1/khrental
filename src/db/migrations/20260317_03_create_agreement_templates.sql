SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.agreement_templates (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_agreement_templates PRIMARY KEY DEFAULT NEWID(),
            tenant_id UNIQUEIDENTIFIER NOT NULL,
            name NVARCHAR(255) NOT NULL,
            language NVARCHAR(100) NOT NULL CONSTRAINT DF_agreement_templates_language DEFAULT N'English',
            content NVARCHAR(MAX) NULL,
            version NVARCHAR(50) NOT NULL CONSTRAINT DF_agreement_templates_version DEFAULT N'1.0',
            createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_agreement_templates_createdat DEFAULT SYSUTCDATETIME(),
            updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_agreement_templates_updatedat DEFAULT SYSUTCDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.agreement_templates', N'tenant_id') IS NULL
    BEGIN
        ALTER TABLE dbo.agreement_templates ADD tenant_id UNIQUEIDENTIFIER NULL;
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.agreement_templates', N'name') IS NULL
    BEGIN
        ALTER TABLE dbo.agreement_templates ADD name NVARCHAR(255) NULL;
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.agreement_templates', N'language') IS NULL
    BEGIN
        ALTER TABLE dbo.agreement_templates ADD language NVARCHAR(100) NOT NULL CONSTRAINT DF_agreement_templates_language_existing DEFAULT N'English';
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.agreement_templates', N'content') IS NULL
    BEGIN
        ALTER TABLE dbo.agreement_templates ADD content NVARCHAR(MAX) NULL;
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.agreement_templates', N'version') IS NULL
    BEGIN
        ALTER TABLE dbo.agreement_templates ADD version NVARCHAR(50) NOT NULL CONSTRAINT DF_agreement_templates_version_existing DEFAULT N'1.0';
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.agreement_templates', N'createdat') IS NULL
    BEGIN
        ALTER TABLE dbo.agreement_templates ADD createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_agreement_templates_createdat_existing DEFAULT SYSUTCDATETIME();
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND COL_LENGTH(N'dbo.agreement_templates', N'updatedat') IS NULL
    BEGIN
        ALTER TABLE dbo.agreement_templates ADD updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_agreement_templates_updatedat_existing DEFAULT SYSUTCDATETIME();
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.tenants', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE name = N'FK_agreement_templates_tenant'
       )
    BEGIN
        ALTER TABLE dbo.agreement_templates
            ADD CONSTRAINT FK_agreement_templates_tenant
            FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id);
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = N'IX_agreement_templates_tenant_id'
              AND object_id = OBJECT_ID(N'dbo.agreement_templates')
       )
    BEGIN
        CREATE INDEX IX_agreement_templates_tenant_id
            ON dbo.agreement_templates (tenant_id);
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE name = N'IX_agreement_templates_name'
              AND object_id = OBJECT_ID(N'dbo.agreement_templates')
       )
    BEGIN
        CREATE INDEX IX_agreement_templates_name
            ON dbo.agreement_templates (name);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;