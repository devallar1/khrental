-- Add app user invitation fields migration for PostgreSQL
-- Adds the invited column to app_users table

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'app_users'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'app_users' AND column_name = 'invited') THEN
            ALTER TABLE app_users ADD COLUMN invited BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
    END IF;
END $$;

COMMIT;
