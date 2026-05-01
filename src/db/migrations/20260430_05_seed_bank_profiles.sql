-- Seed initial bank profiles for the four operator tenants.
-- Idempotent via ON CONFLICT on the (tenant_id, account_number) unique index.
-- If a tenant slug is missing the matching INSERT is a no-op; re-run after
-- npm run import:rentapp to backfill.

BEGIN;

-- KIT — Kubeira IT Park Private Limited
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'HNB Yakkala', 'Kubeira IT Park Private Limited',
       '163010004360', 'Hatton National Bank', 'Yakkala', 'Current account'
  FROM tenants t WHERE t.slug = 'kubeira-it-park'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- KH — Kubeira Holdings Private Limited
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'HNB Nawala', 'Kubeira Holding Private Limited',
       '147010081213', 'Hatton National Bank', 'Nawala', NULL
  FROM tenants t WHERE t.slug = 'kubeira-holdings'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Vishwara — primary corporate account
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'HNB Yakkala', 'Vishwara Residence (Pvt) Ltd',
       '163010007136', 'Hatton National Bank', 'Yakkala', 'Current account'
  FROM tenants t WHERE t.slug = 'vishwara-holdings'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Vishwara — W A M Weerakoon
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'HNB Kaduwela', 'W A M Weerakoon',
       '082020307824', 'Hatton National Bank', 'Kaduwela', NULL
  FROM tenants t WHERE t.slug = 'vishwara-holdings'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Kubeira Family — T. Jeeva Madhumathi Fernando (Commercial Bank)
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'Commercial Bank Malabe', 'T. Jeeva Madhumathi Fernando',
       '8860034973', 'Commercial Bank', 'Malabe', NULL
  FROM tenants t WHERE t.slug = 'kubeira-family'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Kubeira Family — T.J.M Fernando (NTB)
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'NTB Malabe', 'T.J.M Fernando',
       '503212032614', 'Nations Trust Bank', 'Malabe', NULL
  FROM tenants t WHERE t.slug = 'kubeira-family'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Kubeira Family — Obinamuni Liswith Anandage (CDB)
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'CDB Malabe', 'Obinamuni Liswith Anandage',
       '003800476992000101', 'Citizens Development Business Finance', 'Malabe', NULL
  FROM tenants t WHERE t.slug = 'kubeira-family'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Kubeira Family — L A OBINAMUNI (HNB)
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'HNB Nawala', 'L A OBINAMUNI',
       '147020112064', 'Hatton National Bank', 'Nawala', NULL
  FROM tenants t WHERE t.slug = 'kubeira-family'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Cross-tenant: Liswith and Madhu's accounts also receive rent for
-- Kubeira Holdings properties. Same legal account, listed under both
-- tenants. Edits don't propagate between rows; update both if details
-- change (or move to a join table if sharing grows).

-- Kubeira Holdings — Obinamuni Liswith Anandage (CDB)
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'CDB Malabe', 'Obinamuni Liswith Anandage',
       '003800476992000101', 'Citizens Development Business Finance', 'Malabe', NULL
  FROM tenants t WHERE t.slug = 'kubeira-holdings'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

-- Kubeira Holdings — T. Jeeva Madhumathi Fernando (Commercial Bank)
INSERT INTO bank_profiles
  (tenant_id, label, account_holder_name, account_number, bank_name, branch, notes)
SELECT t.id, 'Commercial Bank Malabe', 'T. Jeeva Madhumathi Fernando',
       '8860034973', 'Commercial Bank', 'Malabe', NULL
  FROM tenants t WHERE t.slug = 'kubeira-holdings'
ON CONFLICT (tenant_id, account_number) DO NOTHING;

COMMIT;
