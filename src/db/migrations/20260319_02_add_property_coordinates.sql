-- Add property coordinates migration for PostgreSQL
-- Adds latitude and longitude columns to the properties table

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'properties'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'latitude') THEN
            ALTER TABLE properties ADD COLUMN latitude DECIMAL(10,7);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'longitude') THEN
            ALTER TABLE properties ADD COLUMN longitude DECIMAL(10,7);
        END IF;
    END IF;
END $$;

COMMIT;
