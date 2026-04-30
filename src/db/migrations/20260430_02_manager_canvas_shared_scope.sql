-- Switch manager_canvas_states from per-user to a generic scope key.
--
-- The manager dashboard is a shared operations view (Liswith / Devalla / Ravi
-- all see the same canvas). Keying by auth_user.id meant each person had a
-- private layout. Replace with a `scope TEXT` PK so we can use 'shared' for
-- the team canvas and add per-user rows later if needed (e.g. 'user:<uuid>').

BEGIN;

DROP TABLE IF EXISTS manager_canvas_states;

CREATE TABLE manager_canvas_states (
    scope      TEXT PRIMARY KEY,
    state      JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
