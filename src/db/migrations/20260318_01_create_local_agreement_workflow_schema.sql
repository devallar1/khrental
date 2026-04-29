-- Agreement workflow schema migration for PostgreSQL
-- Creates/augments property_units, agreements, and invoices tables
-- Adds columns to properties, sets up foreign keys and indexes

BEGIN;

-- ============================================================
-- Add columns to properties if they don't exist
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'properties'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'address') THEN
            ALTER TABLE properties ADD COLUMN address TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'propertytype') THEN
            ALTER TABLE properties ADD COLUMN propertytype VARCHAR(100);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'status') THEN
            ALTER TABLE properties ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'available';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'rentalvalues') THEN
            ALTER TABLE properties ADD COLUMN rentalvalues JSONB;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'terms') THEN
            ALTER TABLE properties ADD COLUMN terms JSONB;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bank_name') THEN
            ALTER TABLE properties ADD COLUMN bank_name VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bank_branch') THEN
            ALTER TABLE properties ADD COLUMN bank_branch VARCHAR(255);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bank_account_number') THEN
            ALTER TABLE properties ADD COLUMN bank_account_number VARCHAR(255);
        END IF;
    END IF;
END $$;

-- ============================================================
-- Create property_units table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS property_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    propertyid UUID NOT NULL,
    unitnumber VARCHAR(100) NOT NULL,
    floor VARCHAR(100),
    bedrooms INTEGER,
    bathrooms INTEGER,
    squarefeet DECIMAL(18,2),
    description TEXT,
    rentalvalues JSONB,
    terms JSONB,
    bank_name VARCHAR(255),
    bank_branch VARCHAR(255),
    bank_account_number VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Create agreements table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS agreements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    templateid UUID,
    renteeid UUID,
    propertyid UUID,
    unitid UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    startdate DATE,
    enddate DATE,
    rentamount DECIMAL(18,2),
    depositamount DECIMAL(18,2),
    documenturl TEXT,
    signeddocumenturl TEXT,
    signed_document_url TEXT,
    signatureurl TEXT,
    signature_pdf_url TEXT,
    pdfurl TEXT,
    evia_document_id VARCHAR(255),
    eviasignreference VARCHAR(255),
    title VARCHAR(255),
    content TEXT,
    processedcontent TEXT,
    terms JSONB,
    notes TEXT,
    needs_document_generation BOOLEAN NOT NULL DEFAULT FALSE,
    signature_status VARCHAR(100),
    signature_sent_at TIMESTAMPTZ,
    signature_completed_at TIMESTAMPTZ,
    signatories_status JSONB,
    signeddate TIMESTAMPTZ,
    cancellation_reason TEXT,
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Create invoices table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID,
    renteeid UUID,
    propertyid UUID,
    billingperiod VARCHAR(100),
    components JSONB,
    totalamount DECIMAL(18,2),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    paymentproofurl TEXT,
    paymentdate TIMESTAMPTZ,
    duedate DATE,
    notes TEXT,
    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Foreign keys (idempotent)
-- ============================================================
DO $$
BEGIN
    -- property_units -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_property_units_tenant') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
            ALTER TABLE property_units
                ADD CONSTRAINT fk_property_units_tenant
                FOREIGN KEY (tenant_id) REFERENCES tenants(id);
        END IF;
    END IF;

    -- property_units -> properties
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_property_units_property') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
            ALTER TABLE property_units
                ADD CONSTRAINT fk_property_units_property
                FOREIGN KEY (propertyid) REFERENCES properties(id);
        END IF;
    END IF;

    -- agreements -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agreements_tenant') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
            ALTER TABLE agreements
                ADD CONSTRAINT fk_agreements_tenant
                FOREIGN KEY (tenant_id) REFERENCES tenants(id);
        END IF;
    END IF;

    -- agreements -> properties
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agreements_property') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
            ALTER TABLE agreements
                ADD CONSTRAINT fk_agreements_property
                FOREIGN KEY (propertyid) REFERENCES properties(id);
        END IF;
    END IF;

    -- agreements -> property_units
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agreements_unit') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'property_units') THEN
            ALTER TABLE agreements
                ADD CONSTRAINT fk_agreements_unit
                FOREIGN KEY (unitid) REFERENCES property_units(id);
        END IF;
    END IF;

    -- agreements -> app_users (rentee)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agreements_rentee') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users') THEN
            ALTER TABLE agreements
                ADD CONSTRAINT fk_agreements_rentee
                FOREIGN KEY (renteeid) REFERENCES app_users(id);
        END IF;
    END IF;

    -- agreements -> agreement_templates
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_agreements_template') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agreement_templates') THEN
            ALTER TABLE agreements
                ADD CONSTRAINT fk_agreements_template
                FOREIGN KEY (templateid) REFERENCES agreement_templates(id);
        END IF;
    END IF;

    -- invoices -> tenants
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_tenant') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_tenant
                FOREIGN KEY (tenant_id) REFERENCES tenants(id);
        END IF;
    END IF;

    -- invoices -> properties
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_property') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_property
                FOREIGN KEY (propertyid) REFERENCES properties(id);
        END IF;
    END IF;

    -- invoices -> app_users (rentee)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_invoices_rentee') THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users') THEN
            ALTER TABLE invoices
                ADD CONSTRAINT fk_invoices_rentee
                FOREIGN KEY (renteeid) REFERENCES app_users(id);
        END IF;
    END IF;
END $$;

-- ============================================================
-- Indexes (idempotent)
-- ============================================================
CREATE INDEX IF NOT EXISTS ix_property_units_tenant_id ON property_units (tenant_id);
CREATE INDEX IF NOT EXISTS ix_property_units_propertyid ON property_units (propertyid);
CREATE UNIQUE INDEX IF NOT EXISTS ux_property_units_propertyid_unitnumber ON property_units (propertyid, unitnumber);

CREATE INDEX IF NOT EXISTS ix_agreements_tenant_id ON agreements (tenant_id);
CREATE INDEX IF NOT EXISTS ix_agreements_propertyid ON agreements (propertyid);
CREATE INDEX IF NOT EXISTS ix_agreements_renteeid ON agreements (renteeid);
CREATE INDEX IF NOT EXISTS ix_agreements_status ON agreements (status);

CREATE INDEX IF NOT EXISTS ix_invoices_tenant_id ON invoices (tenant_id);
CREATE INDEX IF NOT EXISTS ix_invoices_propertyid ON invoices (propertyid);
CREATE INDEX IF NOT EXISTS ix_invoices_renteeid ON invoices (renteeid);

COMMIT;
