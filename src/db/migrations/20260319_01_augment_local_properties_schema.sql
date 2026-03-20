SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.properties', N'U') IS NOT NULL
    BEGIN
        IF COL_LENGTH(N'dbo.properties', N'unitconfiguration') IS NULL
            ALTER TABLE dbo.properties ADD unitconfiguration NVARCHAR(255) NULL;

        IF COL_LENGTH(N'dbo.properties', N'checklistitems') IS NULL
            ALTER TABLE dbo.properties ADD checklistitems NVARCHAR(MAX) NULL;

        IF COL_LENGTH(N'dbo.properties', N'description') IS NULL
            ALTER TABLE dbo.properties ADD description NVARCHAR(MAX) NULL;

        IF COL_LENGTH(N'dbo.properties', N'squarefeet') IS NULL
            ALTER TABLE dbo.properties ADD squarefeet DECIMAL(18, 2) NULL;

        IF COL_LENGTH(N'dbo.properties', N'yearbuilt') IS NULL
            ALTER TABLE dbo.properties ADD yearbuilt INT NULL;

        IF COL_LENGTH(N'dbo.properties', N'availablefrom') IS NULL
            ALTER TABLE dbo.properties ADD availablefrom DATETIMEOFFSET NULL;

        IF COL_LENGTH(N'dbo.properties', N'amenities') IS NULL
            ALTER TABLE dbo.properties ADD amenities NVARCHAR(MAX) NULL;

        IF COL_LENGTH(N'dbo.properties', N'electricity_rate') IS NULL
            ALTER TABLE dbo.properties ADD electricity_rate DECIMAL(18, 2) NULL;

        IF COL_LENGTH(N'dbo.properties', N'water_rate') IS NULL
            ALTER TABLE dbo.properties ADD water_rate DECIMAL(18, 2) NULL;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;