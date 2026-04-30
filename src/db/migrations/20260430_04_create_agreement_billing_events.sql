-- Per-agreement billing config, append-only event log.
--
-- The `agreements` row stays lean (unit, dates, rent, deposit). All utility
-- billing modes (electricity / water / SLT / rent strategy) live here as
-- timestamped events:
--   - effective_from = when this config begins applying
--   - config         = full Zod-validated snapshot (see src/lib/billing/config.js)
--   - meter_readings = readings at the moment of change, so the previous
--                      period can be billed cleanly under the OLD config
--                      before the new one takes over
--
-- The "active config for an invoice period" query is:
--   SELECT config FROM agreement_billing_events
--    WHERE agreement_id = $1 AND effective_from <= $period_start
--    ORDER BY effective_from DESC LIMIT 1

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'agreements'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'agreement_billing_events'
    ) THEN
        CREATE TABLE agreement_billing_events (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            agreement_id    UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
            effective_from  DATE NOT NULL,
            config          JSONB NOT NULL,
            meter_readings  JSONB NOT NULL DEFAULT '{}'::jsonb,
            reason          TEXT,
            created_by      UUID REFERENCES auth_user(id) ON DELETE SET NULL,
            createdat       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        -- Only one config can become effective on a given date for an agreement.
        CREATE UNIQUE INDEX ux_billing_events_agreement_eff
            ON agreement_billing_events(agreement_id, effective_from);
        -- Hot-path lookup: most recent event for an agreement up to a date.
        CREATE INDEX ix_billing_events_lookup
            ON agreement_billing_events(agreement_id, effective_from DESC);
    END IF;
END $$;

COMMIT;
