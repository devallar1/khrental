-- Bank profiles — invoicing entities. Each profile is a bank account belonging
-- to one of our tenant orgs. A unit is routed to a bank profile via
-- property_units.bank_profile_id; that profile's details (account holder,
-- account number, bank, branch) are stamped on the rentee's invoices for
-- that unit.
--
-- Uniqueness: an org can't add the same account_number twice. Different orgs
-- can hold accounts at the same bank without colliding.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bank_profiles'
    ) THEN
        CREATE TABLE bank_profiles (
            id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            label                TEXT NOT NULL,
            account_holder_name  TEXT NOT NULL,
            account_number       TEXT NOT NULL,
            bank_name            TEXT NOT NULL,
            branch               TEXT,
            active               BOOLEAN NOT NULL DEFAULT TRUE,
            notes                TEXT,
            createdat            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updatedat            TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX ux_bank_profiles_tenant_account
            ON bank_profiles(tenant_id, account_number);
        CREATE INDEX ix_bank_profiles_tenant_active
            ON bank_profiles(tenant_id) WHERE active;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'property_units'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'property_units' AND column_name = 'bank_profile_id'
    ) THEN
        ALTER TABLE property_units
            ADD COLUMN bank_profile_id UUID REFERENCES bank_profiles(id);
        CREATE INDEX ix_property_units_bank_profile
            ON property_units(bank_profile_id) WHERE bank_profile_id IS NOT NULL;
    END IF;
END $$;

COMMIT;
