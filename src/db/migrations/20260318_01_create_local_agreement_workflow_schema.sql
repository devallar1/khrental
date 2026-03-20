SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.properties', N'U') IS NOT NULL
    BEGIN
        IF COL_LENGTH(N'dbo.properties', N'address') IS NULL
            ALTER TABLE dbo.properties ADD address NVARCHAR(500) NULL;

        IF COL_LENGTH(N'dbo.properties', N'propertytype') IS NULL
            ALTER TABLE dbo.properties ADD propertytype NVARCHAR(100) NULL;

        IF COL_LENGTH(N'dbo.properties', N'status') IS NULL
            ALTER TABLE dbo.properties ADD status NVARCHAR(50) NOT NULL CONSTRAINT DF_properties_status DEFAULT N'available';

        IF COL_LENGTH(N'dbo.properties', N'rentalvalues') IS NULL
            ALTER TABLE dbo.properties ADD rentalvalues NVARCHAR(MAX) NULL;

        IF COL_LENGTH(N'dbo.properties', N'terms') IS NULL
            ALTER TABLE dbo.properties ADD terms NVARCHAR(MAX) NULL;

        IF COL_LENGTH(N'dbo.properties', N'bank_name') IS NULL
            ALTER TABLE dbo.properties ADD bank_name NVARCHAR(255) NULL;

        IF COL_LENGTH(N'dbo.properties', N'bank_branch') IS NULL
            ALTER TABLE dbo.properties ADD bank_branch NVARCHAR(255) NULL;

        IF COL_LENGTH(N'dbo.properties', N'bank_account_number') IS NULL
            ALTER TABLE dbo.properties ADD bank_account_number NVARCHAR(255) NULL;
    END;

    IF OBJECT_ID(N'dbo.property_units', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.property_units (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_property_units PRIMARY KEY DEFAULT NEWID(),
            tenant_id UNIQUEIDENTIFIER NOT NULL,
            propertyid UNIQUEIDENTIFIER NOT NULL,
            unitnumber NVARCHAR(100) NOT NULL,
            floor NVARCHAR(100) NULL,
            bedrooms INT NULL,
            bathrooms INT NULL,
            squarefeet DECIMAL(18, 2) NULL,
            description NVARCHAR(MAX) NULL,
            rentalvalues NVARCHAR(MAX) NULL,
            terms NVARCHAR(MAX) NULL,
            bank_name NVARCHAR(255) NULL,
            bank_branch NVARCHAR(255) NULL,
            bank_account_number NVARCHAR(255) NULL,
            status NVARCHAR(50) NOT NULL CONSTRAINT DF_property_units_status DEFAULT N'available',
            createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_property_units_createdat DEFAULT SYSUTCDATETIME(),
            updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_property_units_updatedat DEFAULT SYSUTCDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.agreements', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.agreements (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_agreements PRIMARY KEY DEFAULT NEWID(),
            tenant_id UNIQUEIDENTIFIER NOT NULL,
            templateid UNIQUEIDENTIFIER NULL,
            renteeid UNIQUEIDENTIFIER NULL,
            propertyid UNIQUEIDENTIFIER NULL,
            unitid UNIQUEIDENTIFIER NULL,
            status NVARCHAR(50) NOT NULL CONSTRAINT DF_agreements_status DEFAULT N'draft',
            startdate DATETIMEOFFSET NULL,
            enddate DATETIMEOFFSET NULL,
            rentamount DECIMAL(18, 2) NULL,
            depositamount DECIMAL(18, 2) NULL,
            documenturl NVARCHAR(MAX) NULL,
            signeddocumenturl NVARCHAR(MAX) NULL,
            signed_document_url NVARCHAR(MAX) NULL,
            signatureurl NVARCHAR(MAX) NULL,
            signature_pdf_url NVARCHAR(MAX) NULL,
            pdfurl NVARCHAR(MAX) NULL,
            evia_document_id NVARCHAR(255) NULL,
            eviasignreference NVARCHAR(255) NULL,
            title NVARCHAR(255) NULL,
            content NVARCHAR(MAX) NULL,
            processedcontent NVARCHAR(MAX) NULL,
            terms NVARCHAR(MAX) NULL,
            notes NVARCHAR(MAX) NULL,
            needs_document_generation BIT NOT NULL CONSTRAINT DF_agreements_needs_document_generation DEFAULT 0,
            signature_status NVARCHAR(100) NULL,
            signature_sent_at DATETIMEOFFSET NULL,
            signature_completed_at DATETIMEOFFSET NULL,
            signatories_status NVARCHAR(MAX) NULL,
            signeddate DATETIMEOFFSET NULL,
            cancellation_reason NVARCHAR(MAX) NULL,
            createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_agreements_createdat DEFAULT SYSUTCDATETIME(),
            updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_agreements_updatedat DEFAULT SYSUTCDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.invoices', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.invoices (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_invoices PRIMARY KEY DEFAULT NEWID(),
            tenant_id UNIQUEIDENTIFIER NOT NULL,
            renteeid UNIQUEIDENTIFIER NULL,
            propertyid UNIQUEIDENTIFIER NULL,
            billingperiod NVARCHAR(100) NULL,
            components NVARCHAR(MAX) NULL,
            totalamount DECIMAL(18, 2) NULL,
            status NVARCHAR(50) NOT NULL CONSTRAINT DF_invoices_status DEFAULT N'pending',
            paymentproofurl NVARCHAR(MAX) NULL,
            paymentdate DATETIMEOFFSET NULL,
            duedate DATETIMEOFFSET NULL,
            notes NVARCHAR(MAX) NULL,
            createdat DATETIMEOFFSET NOT NULL CONSTRAINT DF_invoices_createdat DEFAULT SYSUTCDATETIME(),
            updatedat DATETIMEOFFSET NOT NULL CONSTRAINT DF_invoices_updatedat DEFAULT SYSUTCDATETIME()
        );
    END;

    IF OBJECT_ID(N'dbo.tenants', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.property_units', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_property_units_tenant')
    BEGIN
        ALTER TABLE dbo.property_units
            ADD CONSTRAINT FK_property_units_tenant
            FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id);
    END;

    IF OBJECT_ID(N'dbo.properties', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.property_units', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_property_units_property')
    BEGIN
        ALTER TABLE dbo.property_units
            ADD CONSTRAINT FK_property_units_property
            FOREIGN KEY (propertyid) REFERENCES dbo.properties(id);
    END;

    IF OBJECT_ID(N'dbo.tenants', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_agreements_tenant')
    BEGIN
        ALTER TABLE dbo.agreements
            ADD CONSTRAINT FK_agreements_tenant
            FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id);
    END;

    IF OBJECT_ID(N'dbo.properties', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_agreements_property')
    BEGIN
        ALTER TABLE dbo.agreements
            ADD CONSTRAINT FK_agreements_property
            FOREIGN KEY (propertyid) REFERENCES dbo.properties(id);
    END;

    IF OBJECT_ID(N'dbo.property_units', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_agreements_unit')
    BEGIN
        ALTER TABLE dbo.agreements
            ADD CONSTRAINT FK_agreements_unit
            FOREIGN KEY (unitid) REFERENCES dbo.property_units(id);
    END;

    IF OBJECT_ID(N'dbo.app_users', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_agreements_rentee')
    BEGIN
        ALTER TABLE dbo.agreements
            ADD CONSTRAINT FK_agreements_rentee
            FOREIGN KEY (renteeid) REFERENCES dbo.app_users(id);
    END;

    IF OBJECT_ID(N'dbo.agreement_templates', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_agreements_template')
    BEGIN
        ALTER TABLE dbo.agreements
            ADD CONSTRAINT FK_agreements_template
            FOREIGN KEY (templateid) REFERENCES dbo.agreement_templates(id);
    END;

    IF OBJECT_ID(N'dbo.tenants', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.invoices', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_invoices_tenant')
    BEGIN
        ALTER TABLE dbo.invoices
            ADD CONSTRAINT FK_invoices_tenant
            FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id);
    END;

    IF OBJECT_ID(N'dbo.properties', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.invoices', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_invoices_property')
    BEGIN
        ALTER TABLE dbo.invoices
            ADD CONSTRAINT FK_invoices_property
            FOREIGN KEY (propertyid) REFERENCES dbo.properties(id);
    END;

    IF OBJECT_ID(N'dbo.app_users', N'U') IS NOT NULL
       AND OBJECT_ID(N'dbo.invoices', N'U') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_invoices_rentee')
    BEGIN
        ALTER TABLE dbo.invoices
            ADD CONSTRAINT FK_invoices_rentee
            FOREIGN KEY (renteeid) REFERENCES dbo.app_users(id);
    END;

    IF OBJECT_ID(N'dbo.property_units', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_property_units_tenant_id' AND object_id = OBJECT_ID(N'dbo.property_units')
       )
    BEGIN
        CREATE INDEX IX_property_units_tenant_id ON dbo.property_units (tenant_id);
    END;

    IF OBJECT_ID(N'dbo.property_units', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_property_units_propertyid' AND object_id = OBJECT_ID(N'dbo.property_units')
       )
    BEGIN
        CREATE INDEX IX_property_units_propertyid ON dbo.property_units (propertyid);
    END;

    IF OBJECT_ID(N'dbo.property_units', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'UX_property_units_propertyid_unitnumber' AND object_id = OBJECT_ID(N'dbo.property_units')
       )
    BEGIN
        CREATE UNIQUE INDEX UX_property_units_propertyid_unitnumber ON dbo.property_units (propertyid, unitnumber);
    END;

    IF OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_agreements_tenant_id' AND object_id = OBJECT_ID(N'dbo.agreements')
       )
    BEGIN
        CREATE INDEX IX_agreements_tenant_id ON dbo.agreements (tenant_id);
    END;

    IF OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_agreements_propertyid' AND object_id = OBJECT_ID(N'dbo.agreements')
       )
    BEGIN
        CREATE INDEX IX_agreements_propertyid ON dbo.agreements (propertyid);
    END;

    IF OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_agreements_renteeid' AND object_id = OBJECT_ID(N'dbo.agreements')
       )
    BEGIN
        CREATE INDEX IX_agreements_renteeid ON dbo.agreements (renteeid);
    END;

    IF OBJECT_ID(N'dbo.agreements', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_agreements_status' AND object_id = OBJECT_ID(N'dbo.agreements')
       )
    BEGIN
        CREATE INDEX IX_agreements_status ON dbo.agreements (status);
    END;

    IF OBJECT_ID(N'dbo.invoices', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_invoices_tenant_id' AND object_id = OBJECT_ID(N'dbo.invoices')
       )
    BEGIN
        CREATE INDEX IX_invoices_tenant_id ON dbo.invoices (tenant_id);
    END;

    IF OBJECT_ID(N'dbo.invoices', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_invoices_propertyid' AND object_id = OBJECT_ID(N'dbo.invoices')
       )
    BEGIN
        CREATE INDEX IX_invoices_propertyid ON dbo.invoices (propertyid);
    END;

    IF OBJECT_ID(N'dbo.invoices', N'U') IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM sys.indexes WHERE name = N'IX_invoices_renteeid' AND object_id = OBJECT_ID(N'dbo.invoices')
       )
    BEGIN
        CREATE INDEX IX_invoices_renteeid ON dbo.invoices (renteeid);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;