-- Agreement templates migration for PostgreSQL
-- Ensures agreement_templates table exists with all required columns

BEGIN;

-- Create table if it doesn't exist (may already exist from base schema)
CREATE TABLE IF NOT EXISTS agreement_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    name VARCHAR(255),
    language VARCHAR(100) DEFAULT 'English',
    content TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if they don't exist (in case table was created without them)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_templates' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE agreement_templates ADD COLUMN tenant_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_templates' AND column_name = 'name'
    ) THEN
        ALTER TABLE agreement_templates ADD COLUMN name VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_templates' AND column_name = 'language'
    ) THEN
        ALTER TABLE agreement_templates ADD COLUMN language VARCHAR(100) NOT NULL DEFAULT 'English';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_templates' AND column_name = 'content'
    ) THEN
        ALTER TABLE agreement_templates ADD COLUMN content TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_templates' AND column_name = 'version'
    ) THEN
        ALTER TABLE agreement_templates ADD COLUMN version VARCHAR(50) NOT NULL DEFAULT '1.0';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_templates' AND column_name = 'createdat'
    ) THEN
        ALTER TABLE agreement_templates ADD COLUMN createdat TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agreement_templates' AND column_name = 'updatedat'
    ) THEN
        ALTER TABLE agreement_templates ADD COLUMN updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Foreign key to tenants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_agreement_templates_tenant'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'tenants'
        ) THEN
            ALTER TABLE agreement_templates
                ADD CONSTRAINT fk_agreement_templates_tenant
                FOREIGN KEY (tenant_id) REFERENCES tenants(id);
        END IF;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS ix_agreement_templates_tenant_id
    ON agreement_templates (tenant_id);
CREATE INDEX IF NOT EXISTS ix_agreement_templates_name
    ON agreement_templates (name);

COMMIT;
