SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.properties', N'U') IS NOT NULL
    BEGIN
        IF COL_LENGTH(N'dbo.properties', N'latitude') IS NULL
            ALTER TABLE dbo.properties ADD latitude DECIMAL(10, 7) NULL;

        IF COL_LENGTH(N'dbo.properties', N'longitude') IS NULL
            ALTER TABLE dbo.properties ADD longitude DECIMAL(10, 7) NULL;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;