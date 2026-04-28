-- Augment properties schema migration for PostgreSQL
-- Adds additional columns to the properties table

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'properties'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'unitconfiguration') THEN
            ALTER TABLE properties ADD COLUMN unitconfiguration VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'checklistitems') THEN
            ALTER TABLE properties ADD COLUMN checklistitems TEXT[];
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'description') THEN
            ALTER TABLE properties ADD COLUMN description TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'squarefeet') THEN
            ALTER TABLE properties ADD COLUMN squarefeet DECIMAL(18,2);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'yearbuilt') THEN
            ALTER TABLE properties ADD COLUMN yearbuilt INTEGER;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'availablefrom') THEN
            ALTER TABLE properties ADD COLUMN availablefrom TIMESTAMPTZ;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'amenities') THEN
            ALTER TABLE properties ADD COLUMN amenities TEXT[];
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'electricity_rate') THEN
            ALTER TABLE properties ADD COLUMN electricity_rate DECIMAL(18,2);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'water_rate') THEN
            ALTER TABLE properties ADD COLUMN water_rate DECIMAL(18,2);
        END IF;
    END IF;
END $$;

COMMIT;
