-- Per-user manager dashboard canvas state.
--
-- Stores card positions, sticky notes, and districts as a single JSONB
-- payload keyed on auth_user.id. Last-write-wins: any save overwrites the
-- previous payload. Cross-tab / cross-device sync handled client-side via
-- focus refetch and BroadcastChannel.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'auth_user'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'manager_canvas_states'
    ) THEN
        CREATE TABLE manager_canvas_states (
            user_id    UUID PRIMARY KEY REFERENCES auth_user(id) ON DELETE CASCADE,
            state      JSONB NOT NULL DEFAULT '{}'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

COMMIT;
