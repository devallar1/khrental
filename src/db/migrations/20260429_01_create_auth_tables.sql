-- Self-hosted auth foundation (Better-Auth-managed tables).
-- Sprint: auth-v1. Idempotent; safe to re-run.
--
-- Naming: auth_* prefix keeps these out of the way of app_users / domain tables.
--         Column names are double-quoted camelCase because Better-Auth uses
--         camelCase identifiers and we don't want a runtime mapping layer.

BEGIN;

-- ============================================================
-- auth_user
-- Identity row. One per human across the whole instance.
-- Linked from app_users.auth_id (one auth_user can hold many app_users
-- rows, one per (tenant_id, role) — see 20260429_02_app_users_auth_link.sql).
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_user (
    "id"                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"                TEXT,
    "email"               TEXT            UNIQUE,
    "emailVerified"       BOOLEAN         NOT NULL DEFAULT FALSE,
    "image"               TEXT,
    "phoneNumber"         TEXT            UNIQUE,
    "phoneNumberVerified" BOOLEAN         NOT NULL DEFAULT FALSE,
    "createdAt"           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    "updatedAt"           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT auth_user_email_or_phone CHECK (
        "email" IS NOT NULL OR "phoneNumber" IS NOT NULL
    )
);

-- ============================================================
-- auth_session
-- Cookie-backed sessions. Better-Auth manages rolling expiry.
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_session (
    "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"     UUID         NOT NULL REFERENCES auth_user("id") ON DELETE CASCADE,
    "token"      TEXT         NOT NULL UNIQUE,
    "expiresAt"  TIMESTAMPTZ  NOT NULL,
    "ipAddress"  TEXT,
    "userAgent"  TEXT,
    "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auth_session_userId ON auth_session ("userId");
CREATE INDEX IF NOT EXISTS ix_auth_session_expiresAt ON auth_session ("expiresAt");

-- ============================================================
-- auth_account
-- Per-provider rows. providerId = 'credential' (email+password),
-- 'phone' (OTP), 'google' (OIDC). One auth_user can have many.
-- This is where account linking shows up: same userId, two providers.
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_account (
    "id"                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"                  UUID         NOT NULL REFERENCES auth_user("id") ON DELETE CASCADE,
    "accountId"               TEXT         NOT NULL,
    "providerId"              TEXT         NOT NULL,
    "accessToken"             TEXT,
    "refreshToken"            TEXT,
    "idToken"                 TEXT,
    "accessTokenExpiresAt"    TIMESTAMPTZ,
    "refreshTokenExpiresAt"   TIMESTAMPTZ,
    "scope"                   TEXT,
    "password"                TEXT,
    "createdAt"               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_account_provider_account
    ON auth_account ("providerId", "accountId");
CREATE INDEX IF NOT EXISTS ix_auth_account_userId ON auth_account ("userId");

-- ============================================================
-- auth_verification
-- Holds short-lived tokens: phone OTPs, magic links, email verifications.
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_verification (
    "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "identifier"  TEXT         NOT NULL,
    "value"       TEXT         NOT NULL,
    "expiresAt"   TIMESTAMPTZ  NOT NULL,
    "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_auth_verification_identifier
    ON auth_verification ("identifier");
CREATE INDEX IF NOT EXISTS ix_auth_verification_expiresAt
    ON auth_verification ("expiresAt");

COMMIT;
