/**
 * Import RENTAPPINFO.xlsx into the khrental Postgres database.
 *
 * Multi-tenant ownership model: each property is scoped under the legal-owner
 * tenant. Tenants used:
 *   - kubeira-family       (Kubeira Family)
 *   - kubeira-holdings     (Kubeira Holdings Private Limited)
 *   - kubeira-it-park      (Kubeira IT Park Private Limited)
 *   - vishwara-holdings    (Vishwara Holdings Private Limited — created if missing)
 *
 * Usage:
 *   npm run import:rentapp -- [--dry-run] [--sheet=1|2|all] [--file=./RENTAPPINFO.xlsx]
 */

import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
import { runQuery, runSingleQuery } from '../api/db/query.js';
import { closePool } from '../api/db/pool.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const TENANT_FAMILY = 'kubeira-family';
const TENANT_HOLDINGS = 'kubeira-holdings';
const TENANT_IT_PARK = 'kubeira-it-park';
const TENANT_VISHWARA = 'vishwara-holdings';

const VISHWARA_TENANT_DEFINITION = {
  slug: TENANT_VISHWARA,
  name: 'Vishwara Holdings Private Limited',
  plan: 'enterprise',
  status: 'active'
};

const UNASSIGNED_BUCKET = 'Unassigned (Manual review)';

/**
 * Each bucket = (tenantSlug, propertyName) pair. Phase 0 seeds one property row
 * per bucket under the right tenant. Phase A/B route each xlsx row to one bucket.
 */
const PROPERTY_BUCKETS = [
  {
    propertyName: 'Kotte Residence',
    tenantSlug: TENANT_FAMILY,
    description: 'Personal asset of the Kubeira family',
    propertytype: 'residential'
  },
  {
    propertyName: 'Kubeira Research Escape',
    tenantSlug: TENANT_HOLDINGS,
    description: 'Owned by Kubeira Holdings Private Limited',
    propertytype: 'residential'
  },
  {
    propertyName: 'Vishwara Residences',
    tenantSlug: TENANT_VISHWARA,
    description: 'Owned by Vishwara Holdings Private Limited',
    propertytype: 'residential'
  },
  {
    propertyName: 'Kubeira IT Park',
    tenantSlug: TENANT_IT_PARK,
    description: 'Owned by Kubeira IT Park Private Limited (single unit leased to TECHONE)',
    propertytype: 'commercial'
  },
  {
    propertyName: 'Waterfall Residences',
    tenantSlug: TENANT_HOLDINGS,
    description: 'Owned by Kubeira Holdings Private Limited — confirm',
    propertytype: 'residential'
  },
  {
    propertyName: 'Matale Property',
    tenantSlug: TENANT_HOLDINGS,
    description: 'Owned by Kubeira Holdings Private Limited (jointly held with the Kubeira family — consolidated land parcels)',
    propertytype: 'mixed'
  },
  {
    propertyName: UNASSIGNED_BUCKET,
    tenantSlug: TENANT_HOLDINGS,
    description: 'Auto-bucket for rows that did not match any owner rule. Triage and reassign.',
    propertytype: null
  }
];

const PLACEHOLDER_UNITS_TO_PURGE = {
  tenantSlug: TENANT_HOLDINGS,
  propertyName: 'Kubeira Research Escape',
  unitnumbers: ['Unit A1', 'Unit A2', 'Unit B1', 'Unit B2', 'Unit C1', 'Unit C2']
};

// ----------------------------------------------------------------------------
// argv parsing
// ----------------------------------------------------------------------------

const parseArgs = () => {
  const args = { dryRun: false, sheet: 'all', file: path.join(REPO_ROOT, 'RENTAPPINFO.xlsx') };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--sheet=')) args.sheet = arg.slice('--sheet='.length);
    else if (arg.startsWith('--file=')) args.file = path.resolve(arg.slice('--file='.length));
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: npm run import:rentapp -- [--dry-run] [--sheet=1|2|all] [--file=<path>]');
      process.exit(0);
    } else {
      console.warn(`[warn] Unknown argument: ${arg}`);
    }
  }
  return args;
};

// ----------------------------------------------------------------------------
// Generic helpers
// ----------------------------------------------------------------------------

const trim = (v) => (v == null ? '' : String(v).trim());
const upper = (v) => trim(v).toUpperCase();
const slugify = (v) => trim(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const isBlank = (v) => trim(v).length === 0;

const toNumber = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const normalizeUnitNumber = (v) => upper(v).replace(/\s+/g, ' ').trim();

const stripLeadingPrefix = (code) => {
  const c = upper(code).replace(/[^A-Z0-9/-]/g, '');
  if (/^[AKM]\d/.test(c)) return c;
  return c.replace(/^[A-Z]+/, '');
};

const summarizeReasons = (entries) => {
  const counts = {};
  for (const e of entries) counts[e] = (counts[e] || 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
};

const parseJson = (v) => {
  if (v == null) return null;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return null; }
};

// ----------------------------------------------------------------------------
// State + dry-run aware DB wrapper
// ----------------------------------------------------------------------------

class ImportState {
  constructor({ dryRun, tenantIdsBySlug, bucketIds }) {
    this.dryRun = dryRun;
    this.tenantIdsBySlug = tenantIdsBySlug;
    this.bucketIds = bucketIds; // propertyName -> { id, tenantId }
    this.counts = {
      tenants: { created: 0, updated: 0, skipped: 0 },
      properties: { created: 0, updated: 0, skipped: 0 },
      property_units: { created: 0, updated: 0, skipped: 0, deleted: 0 },
      app_users: { created: 0, updated: 0, skipped: 0 },
      agreements: { created: 0, updated: 0, skipped: 0 },
      invoices: { created: 0, updated: 0, skipped: 0 }
    };
    this.skippedRows = [];
    this.unassignedRows = [];
    this.synthesizedFromSheet2 = [];
  }

  bump(table, kind) {
    if (!this.counts[table]) return;
    this.counts[table][kind] = (this.counts[table][kind] || 0) + 1;
  }

  log(level, msg) {
    const tag = this.dryRun ? '[dry-run]' : '[live]';
    if (level === 'error') console.error(`${tag} ${msg}`);
    else console.log(`${tag} ${msg}`);
  }

  bucketFor(propertyName) {
    const b = this.bucketIds[propertyName];
    if (!b) throw new Error(`Bucket "${propertyName}" was not seeded`);
    return b;
  }
}

const dbInsertReturning = async (state, sql, params, fakeRow) => {
  if (state.dryRun) return fakeRow;
  const rows = await runQuery(sql, params);
  return rows[0] || null;
};

const dbUpdate = async (state, sql, params) => {
  if (state.dryRun) return;
  await runQuery(sql, params);
};

// ----------------------------------------------------------------------------
// Tenant resolution + creation
// ----------------------------------------------------------------------------

const ensureTenant = async (state, definition) => {
  const existing = await runSingleQuery(
    `SELECT id FROM tenants WHERE slug = @slug LIMIT 1`,
    { slug: definition.slug }
  );
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  await dbInsertReturning(
    state,
    `INSERT INTO tenants (id, name, slug, status, "plan", createdat, updatedat)
     VALUES (@id, @name, @slug, @status, @plan, NOW(), NOW())
     RETURNING id`,
    { id, ...definition },
    { id }
  );
  state.bump('tenants', 'created');
  state.log('info', `tenants.${definition.slug}: created`);
  return id;
};

const resolveTenantIds = async (state) => {
  const result = {};
  for (const slug of [TENANT_FAMILY, TENANT_HOLDINGS, TENANT_IT_PARK]) {
    const row = await runSingleQuery(
      `SELECT id FROM tenants WHERE slug = @slug LIMIT 1`,
      { slug }
    );
    if (!row) {
      throw new Error(`Required tenant "${slug}" not found in DB. Existing tenants must be set up before this importer runs.`);
    }
    result[slug] = row.id;
  }
  result[TENANT_VISHWARA] = await ensureTenant(state, VISHWARA_TENANT_DEFINITION);
  return result;
};

// ----------------------------------------------------------------------------
// Phase Pre-0: purge known placeholder units
// ----------------------------------------------------------------------------

const purgePlaceholderUnits = async (state) => {
  const tenantId = state.tenantIdsBySlug[PLACEHOLDER_UNITS_TO_PURGE.tenantSlug];
  const property = await runSingleQuery(
    `SELECT id FROM properties
     WHERE tenant_id = @tenantId AND name = @name LIMIT 1`,
    { tenantId, name: PLACEHOLDER_UNITS_TO_PURGE.propertyName }
  );
  if (!property) {
    state.log('info', `purge: property "${PLACEHOLDER_UNITS_TO_PURGE.propertyName}" not found — nothing to purge`);
    return;
  }

  const existing = await runQuery(
    `SELECT id, unitnumber FROM property_units
     WHERE tenant_id = @tenantId AND propertyid = @propertyid
       AND unitnumber = ANY(@unitnumbers::text[])`,
    {
      tenantId,
      propertyid: property.id,
      unitnumbers: PLACEHOLDER_UNITS_TO_PURGE.unitnumbers
    }
  );

  if (existing.length === 0) {
    state.log('info', 'purge: no placeholder units to remove (already clean)');
    return;
  }

  state.log('info', `purge: deleting ${existing.length} placeholder unit(s) from "${PLACEHOLDER_UNITS_TO_PURGE.propertyName}": ${existing.map((u) => u.unitnumber).join(', ')}`);
  if (!state.dryRun) {
    await runQuery(
      `DELETE FROM property_units
       WHERE tenant_id = @tenantId AND propertyid = @propertyid
         AND unitnumber = ANY(@unitnumbers::text[])`,
      {
        tenantId,
        propertyid: property.id,
        unitnumbers: PLACEHOLDER_UNITS_TO_PURGE.unitnumbers
      }
    );
  }
  state.counts.property_units.deleted += existing.length;
};

// ----------------------------------------------------------------------------
// Phase 0: seed property buckets
// ----------------------------------------------------------------------------

const upsertPropertyBucket = async (state, bucket) => {
  const tenantId = state.tenantIdsBySlug[bucket.tenantSlug];
  const existing = await runSingleQuery(
    `SELECT id, description, propertytype
     FROM properties
     WHERE tenant_id = @tenantId AND name = @name
     LIMIT 1`,
    { tenantId, name: bucket.propertyName }
  );

  if (existing) {
    const updates = [];
    const params = { id: existing.id, updatedat: new Date().toISOString() };
    if (!existing.description && bucket.description) {
      updates.push('description = @description');
      params.description = bucket.description;
    }
    if (!existing.propertytype && bucket.propertytype) {
      updates.push('propertytype = @propertytype');
      params.propertytype = bucket.propertytype;
    }
    if (updates.length === 0) {
      state.bump('properties', 'skipped');
      return { id: existing.id, tenantId };
    }
    updates.push('updatedat = @updatedat');
    await dbUpdate(state, `UPDATE properties SET ${updates.join(', ')} WHERE id = @id`, params);
    state.bump('properties', 'updated');
    return { id: existing.id, tenantId };
  }

  const id = crypto.randomUUID();
  await dbInsertReturning(
    state,
    `INSERT INTO properties (id, tenant_id, name, description, propertytype, status, createdat, updatedat)
     VALUES (@id, @tenantId, @name, @description, @propertytype, 'available', NOW(), NOW())
     RETURNING id`,
    { id, tenantId, name: bucket.propertyName, description: bucket.description, propertytype: bucket.propertytype },
    { id }
  );
  state.bump('properties', 'created');
  state.log('info', `properties.${bucket.propertyName} (under ${bucket.tenantSlug}): created`);
  return { id, tenantId };
};

const seedAllBuckets = async (state) => {
  const map = {};
  for (const b of PROPERTY_BUCKETS) {
    map[b.propertyName] = await upsertPropertyBucket(state, b);
  }
  return map;
};

// ----------------------------------------------------------------------------
// Bucketing logic
// ----------------------------------------------------------------------------

const bucketForRow = ({ city, nickname, cashCredited }) => {
  const c = upper(city);
  const n = upper(nickname);
  const cc = upper(cashCredited);

  if (c === 'KOTTE') return 'Kotte Residence';
  if (c === 'ATHURUGIRIYA') return 'Kubeira Research Escape';
  if (c === 'HEYANTUDUWA' || cc.includes('VISHWARA')) return 'Vishwara Residences';
  if (n === 'TECHONE') return 'Kubeira IT Park';
  if (c === 'THALAWAKALE' || n === 'SUDARAKA') return 'Waterfall Residences';
  if (c === 'MATALE') return 'Matale Property';
  return UNASSIGNED_BUCKET;
};

// ----------------------------------------------------------------------------
// Per-table upserts (tenant_id passed in explicitly)
// ----------------------------------------------------------------------------

const upsertPropertyUnit = async (state, { tenantId, propertyid, unitnumber, description, status, squarefeet }) => {
  const existing = await runSingleQuery(
    `SELECT id, description, status, squarefeet
     FROM property_units
     WHERE tenant_id = @tenantId AND propertyid = @propertyid AND unitnumber = @unitnumber
     LIMIT 1`,
    { tenantId, propertyid, unitnumber }
  );

  if (existing) {
    const updates = [];
    const params = { id: existing.id, updatedat: new Date().toISOString() };
    if (!existing.description && description) {
      updates.push('description = @description');
      params.description = description;
    }
    if ((!existing.status || existing.status === 'available') && status && status !== 'available') {
      updates.push('status = @status');
      params.status = status;
    }
    if (existing.squarefeet == null && squarefeet != null) {
      updates.push('squarefeet = @squarefeet');
      params.squarefeet = squarefeet;
    }
    if (updates.length === 0) {
      state.bump('property_units', 'skipped');
      return existing.id;
    }
    updates.push('updatedat = @updatedat');
    await dbUpdate(state, `UPDATE property_units SET ${updates.join(', ')} WHERE id = @id`, params);
    state.bump('property_units', 'updated');
    return existing.id;
  }

  const id = crypto.randomUUID();
  await dbInsertReturning(
    state,
    `INSERT INTO property_units (id, tenant_id, propertyid, unitnumber, description, status, squarefeet, createdat, updatedat)
     VALUES (@id, @tenantId, @propertyid, @unitnumber, @description, @status, @squarefeet, NOW(), NOW())
     RETURNING id`,
    {
      id, tenantId, propertyid, unitnumber,
      description: description || null,
      status: status || 'available',
      squarefeet: squarefeet ?? null
    },
    { id }
  );
  state.bump('property_units', 'created');
  return id;
};

const upsertRentee = async (state, { tenantId, nic, name, phone, permanentAddress, propertyid, isCorporate }) => {
  let existing = null;
  if (nic && !isCorporate) {
    existing = await runSingleQuery(
      `SELECT id, contact_details, permanent_address
       FROM app_users
       WHERE tenant_id = @tenantId AND national_id = @nic
       LIMIT 1`,
      { tenantId, nic }
    );
  } else {
    existing = await runSingleQuery(
      `SELECT id, contact_details, permanent_address
       FROM app_users
       WHERE tenant_id = @tenantId
         AND user_type = 'rentee'
         AND name = @name
         AND (national_id IS NULL OR national_id = '')
       LIMIT 1`,
      { tenantId, name }
    );
  }

  if (existing) {
    const updates = [];
    const params = { id: existing.id, updatedat: new Date().toISOString() };
    const mergedContact = { ...(parseJson(existing.contact_details) || {}) };
    if (phone && !mergedContact.phone) {
      mergedContact.phone = phone;
      updates.push('contact_details = @contact_details');
      params.contact_details = JSON.stringify(mergedContact);
    }
    if (!existing.permanent_address && permanentAddress) {
      updates.push('permanent_address = @permanent_address');
      params.permanent_address = permanentAddress;
    }
    if (updates.length === 0) {
      state.bump('app_users', 'skipped');
      return existing.id;
    }
    updates.push('updatedat = @updatedat');
    await dbUpdate(state, `UPDATE app_users SET ${updates.join(', ')} WHERE id = @id`, params);
    state.bump('app_users', 'updated');
    return existing.id;
  }

  const id = crypto.randomUUID();
  const email = isCorporate
    ? `corp-${slugify(name) || id}@import.local`
    : `nic-${slugify(nic) || id}@import.local`;
  await dbInsertReturning(
    state,
    `INSERT INTO app_users (
       id, tenant_id, email, name, role, user_type, contact_details,
       national_id, permanent_address, status, active, invited, createdat, updatedat
     ) VALUES (
       @id, @tenantId, @email, @name, 'rentee', 'rentee', @contact_details,
       @national_id, @permanent_address, 'active', TRUE, FALSE, NOW(), NOW()
     ) RETURNING id`,
    {
      id, tenantId, email,
      name: name || (nic ? `Rentee ${nic}` : 'Unknown Rentee'),
      contact_details: phone ? JSON.stringify({ phone }) : null,
      national_id: isCorporate ? null : (nic || null),
      permanent_address: permanentAddress || null
    },
    { id }
  );
  state.bump('app_users', 'created');
  return id;
};

const upsertAgreement = async (state, { tenantId, propertyid, unitid, renteeid, rentamount, depositamount, periodText, legacyRef, salesCommission, occupancyStatus }) => {
  const existing = await runSingleQuery(
    `SELECT id, rentamount, depositamount, terms, notes
     FROM agreements
     WHERE tenant_id = @tenantId
       AND propertyid = @propertyid
       AND unitid = @unitid
       AND renteeid = @renteeid
       AND status IN ('draft','signed')
     ORDER BY createdat DESC LIMIT 1`,
    { tenantId, propertyid, unitid, renteeid }
  );

  const status = upper(occupancyStatus) === 'OCCUPIED' ? 'signed' : 'draft';
  const notesParts = [];
  if (legacyRef) notesParts.push(`legacy_ref:${legacyRef}`);
  if (salesCommission != null) notesParts.push(`sales_commission:${salesCommission}`);
  const notes = notesParts.join(' | ') || null;
  const terms = periodText ? { period: periodText } : null;

  if (existing) {
    const updates = [];
    const params = { id: existing.id, updatedat: new Date().toISOString() };
    if (existing.rentamount == null && rentamount != null) {
      updates.push('rentamount = @rentamount');
      params.rentamount = rentamount;
    }
    if (existing.depositamount == null && depositamount != null) {
      updates.push('depositamount = @depositamount');
      params.depositamount = depositamount;
    }
    if (!existing.terms && terms) {
      updates.push('terms = @terms');
      params.terms = JSON.stringify(terms);
    }
    if (!existing.notes && notes) {
      updates.push('notes = @notes');
      params.notes = notes;
    }
    if (updates.length === 0) {
      state.bump('agreements', 'skipped');
      return existing.id;
    }
    updates.push('updatedat = @updatedat');
    await dbUpdate(state, `UPDATE agreements SET ${updates.join(', ')} WHERE id = @id`, params);
    state.bump('agreements', 'updated');
    return existing.id;
  }

  const id = crypto.randomUUID();
  await dbInsertReturning(
    state,
    `INSERT INTO agreements (
       id, tenant_id, propertyid, unitid, renteeid, status,
       rentamount, depositamount, terms, notes, createdat, updatedat
     ) VALUES (
       @id, @tenantId, @propertyid, @unitid, @renteeid, @status,
       @rentamount, @depositamount, @terms, @notes, NOW(), NOW()
     ) RETURNING id`,
    {
      id, tenantId, propertyid, unitid, renteeid, status,
      rentamount: rentamount ?? null,
      depositamount: depositamount ?? null,
      terms: terms ? JSON.stringify(terms) : null,
      notes
    },
    { id }
  );
  state.bump('agreements', 'created');
  return id;
};

const upsertInvoice = async (state, { tenantId, propertyid, renteeid, billingperiod, components, totalamount, status }) => {
  const existing = await runSingleQuery(
    `SELECT id FROM invoices
     WHERE tenant_id = @tenantId AND propertyid = @propertyid AND renteeid = @renteeid AND billingperiod = @billingperiod
     LIMIT 1`,
    { tenantId, propertyid, renteeid, billingperiod }
  );

  if (existing) {
    await dbUpdate(
      state,
      `UPDATE invoices
       SET components = @components, totalamount = @totalamount, status = @status, updatedat = @updatedat
       WHERE id = @id`,
      {
        id: existing.id,
        components: JSON.stringify(components),
        totalamount,
        status,
        updatedat: new Date().toISOString()
      }
    );
    state.bump('invoices', 'updated');
    return existing.id;
  }

  const id = crypto.randomUUID();
  await dbInsertReturning(
    state,
    `INSERT INTO invoices (
       id, tenant_id, propertyid, renteeid, billingperiod, components, totalamount, status, createdat, updatedat
     ) VALUES (
       @id, @tenantId, @propertyid, @renteeid, @billingperiod, @components, @totalamount, @status, NOW(), NOW()
     ) RETURNING id`,
    {
      id, tenantId, propertyid, renteeid, billingperiod,
      components: JSON.stringify(components),
      totalamount, status
    },
    { id }
  );
  state.bump('invoices', 'created');
  return id;
};

const updateBucketBank = async (state, bucket, bankName) => {
  if (!bankName) return;
  const cur = await runSingleQuery(
    `SELECT bank_name FROM properties WHERE id = @id LIMIT 1`,
    { id: bucket.id }
  );
  if (cur && !cur.bank_name) {
    await dbUpdate(
      state,
      `UPDATE properties SET bank_name = @bank, updatedat = @updatedat WHERE id = @id`,
      { id: bucket.id, bank: bankName, updatedat: new Date().toISOString() }
    );
  }
};

// ----------------------------------------------------------------------------
// Phase A: Sheet 1 ingest
// ----------------------------------------------------------------------------

const SHEET1_HEADERS = {
  NICNAME: 'NICNAME',
  CITY: 'CITY LOCATED',
  UNIT_NO: 'UNIT NO',
  UNIT_NAME: 'UNIT NAME',
  LESSOR_ADDRESS: 'LESSOR ADDRESS',
  AGREEMENT_NUMBER: 'AGREEMENT NUMBER',
  OCCUPANCY_STATUS: 'OCCUPANCY STATUS',
  SECURITY_DEPOSIT: 'SECURITY DEPOSIT',
  SALES_COMMISSION: 'SALES COMMISSION',
  TENANT_INFORMATION: 'TENANT INFORMATION',
  NIC: 'NIC',
  CONTACT_NUMBER: 'CONTACT NUMBER',
  PERMANENT_ADDRESS: 'LESSEE. PERMANENT ADDRESS',
  CONTRACT_PERIOD: 'CONTRACT PERIOD',
  UNIT_RENT: 'UNIT RENT',
  CASH_CREDITED: 'CASH CREDITED',
  SQ_FEET: 'SQ FEET'
};

const findHeaderRowIndex = (rows) => {
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const cells = (rows[i] || []).map((c) => upper(c));
    if (cells.includes('NIC') && cells.includes('UNIT NO')) return i;
  }
  return 0;
};

const buildHeaderMap = (headerRow) => {
  const map = {};
  headerRow.forEach((cell, idx) => {
    const key = upper(cell).replace(/\s+/g, ' ').trim();
    if (key) map[key] = idx;
  });
  if (map['LESSEE PERMANENT ADDRESS'] && !map[SHEET1_HEADERS.PERMANENT_ADDRESS]) {
    map[SHEET1_HEADERS.PERMANENT_ADDRESS] = map['LESSEE PERMANENT ADDRESS'];
  }
  return map;
};

const get = (row, headerMap, header) => {
  const idx = headerMap[header];
  return idx == null ? undefined : row[idx];
};

const ingestSheet1 = async (state, workbook) => {
  const sheet = workbook.Sheets['Rent units'];
  if (!sheet) {
    state.log('error', "Sheet 'Rent units' not found — skipping Phase A");
    return;
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headerIdx = findHeaderRowIndex(rows);
  const headerMap = buildHeaderMap(rows[headerIdx] || []);
  state.log('info', `Sheet 1 header at row ${headerIdx + 1}; ${rows.length - headerIdx - 1} data rows`);

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every(isBlank)) continue;

    const nickname = trim(get(row, headerMap, SHEET1_HEADERS.NICNAME));
    const city = trim(get(row, headerMap, SHEET1_HEADERS.CITY));
    const unitNoRaw = trim(get(row, headerMap, SHEET1_HEADERS.UNIT_NO));
    const unitName = trim(get(row, headerMap, SHEET1_HEADERS.UNIT_NAME));
    const lessorAddress = trim(get(row, headerMap, SHEET1_HEADERS.LESSOR_ADDRESS));
    const agreementNumber = trim(get(row, headerMap, SHEET1_HEADERS.AGREEMENT_NUMBER));
    const occupancyStatus = trim(get(row, headerMap, SHEET1_HEADERS.OCCUPANCY_STATUS));
    const securityDeposit = toNumber(get(row, headerMap, SHEET1_HEADERS.SECURITY_DEPOSIT));
    const salesCommission = toNumber(get(row, headerMap, SHEET1_HEADERS.SALES_COMMISSION));
    const tenantInfo = trim(get(row, headerMap, SHEET1_HEADERS.TENANT_INFORMATION));
    const nic = trim(get(row, headerMap, SHEET1_HEADERS.NIC));
    const contactNumber = trim(get(row, headerMap, SHEET1_HEADERS.CONTACT_NUMBER));
    const permanentAddress = trim(get(row, headerMap, SHEET1_HEADERS.PERMANENT_ADDRESS));
    const contractPeriod = trim(get(row, headerMap, SHEET1_HEADERS.CONTRACT_PERIOD));
    const unitRent = toNumber(get(row, headerMap, SHEET1_HEADERS.UNIT_RENT));
    const cashCredited = trim(get(row, headerMap, SHEET1_HEADERS.CASH_CREDITED));
    const squareFeet = toNumber(get(row, headerMap, SHEET1_HEADERS.SQ_FEET));

    if (!nic && !unitNoRaw) {
      state.skippedRows.push({ row: r + 1, reason: 'no NIC and no UNIT NO' });
      continue;
    }

    const bucketName = bucketForRow({ city, nickname, cashCredited });
    if (bucketName === UNASSIGNED_BUCKET) {
      state.unassignedRows.push({ row: r + 1, city, nickname, unitNo: unitNoRaw });
    }
    const bucket = state.bucketFor(bucketName);

    let unitid = null;
    if (unitNoRaw) {
      const unitnumber = normalizeUnitNumber(unitNoRaw);
      const description = [unitName, lessorAddress].filter(Boolean).join(' — ') || null;
      const status = upper(occupancyStatus) === 'OCCUPIED' ? 'occupied' : 'available';
      unitid = await upsertPropertyUnit(state, {
        tenantId: bucket.tenantId,
        propertyid: bucket.id,
        unitnumber,
        description,
        status,
        squarefeet: squareFeet
      });
    }

    let renteeid = null;
    if (nic || tenantInfo || nickname) {
      const isCorporate = !nic && (
        upper(tenantInfo).includes('PVT')
        || upper(tenantInfo).includes('LIMITED')
        || upper(tenantInfo).includes('LTD')
        || upper(nickname) === 'TECHONE'
      );
      const name = tenantInfo || nickname || `Rentee ${nic || 'unknown'}`;
      renteeid = await upsertRentee(state, {
        tenantId: bucket.tenantId,
        nic: nic || null,
        name,
        phone: contactNumber || null,
        permanentAddress: permanentAddress || null,
        propertyid: bucket.id,
        isCorporate
      });
    }

    if (unitid && renteeid) {
      await upsertAgreement(state, {
        tenantId: bucket.tenantId,
        propertyid: bucket.id,
        unitid,
        renteeid,
        rentamount: unitRent,
        depositamount: securityDeposit,
        periodText: contractPeriod || null,
        legacyRef: agreementNumber || null,
        salesCommission,
        occupancyStatus
      });
    }

    if (cashCredited) {
      await updateBucketBank(state, bucket, cashCredited);
    }
  }
};

// ----------------------------------------------------------------------------
// Phase B: Sheet 2 ingest
// ----------------------------------------------------------------------------

const findExpenseRow = (rows, label) => {
  for (let r = 3; r < rows.length; r++) {
    if (upper(trim(rows[r]?.[0])) === upper(label)) return r;
  }
  return null;
};

const formatBillingPeriod = (cell) => {
  if (cell == null || cell === '') return null;
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + cell * 86400000);
    return d.toISOString().slice(0, 10);
  }
  return trim(cell);
};

const guessBucketFromUnitCode = (unitCode, tenantNick) => {
  if (upper(tenantNick) === 'TECHONE') return 'Kubeira IT Park';
  const c = upper(unitCode);
  if (c.startsWith('V')) return 'Vishwara Residences';
  if (c.startsWith('WF') || c.startsWith('W')) return 'Waterfall Residences';
  if (c.startsWith('A')) return 'Kubeira Research Escape';
  if (c.startsWith('K')) return 'Kotte Residence';
  return UNASSIGNED_BUCKET;
};

const ingestSheet2 = async (state, workbook) => {
  const sheet = workbook.Sheets['Sheet2'];
  if (!sheet) {
    state.log('error', "Sheet 'Sheet2' not found — skipping Phase B");
    return;
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (rows.length < 4) {
    state.log('error', 'Sheet2 has fewer than 4 rows — skipping Phase B');
    return;
  }

  const headerRow = rows[0];
  const dateRow = rows[1] || [];
  const tenantRow = rows[2] || [];

  for (let col = 1; col < headerRow.length; col++) {
    const unitCode = trim(headerRow[col]);
    if (!unitCode) continue;
    const tenantNick = trim(tenantRow[col]);
    const billingPeriod = formatBillingPeriod(dateRow[col]);

    // Try exact match first against any tenant.
    let unit = await runSingleQuery(
      `SELECT u.id, u.propertyid, u.tenant_id
       FROM property_units u
       WHERE UPPER(u.unitnumber) = @code
       LIMIT 1`,
      { code: upper(unitCode) }
    );
    if (!unit) {
      const stripped = stripLeadingPrefix(unitCode);
      if (stripped && stripped !== upper(unitCode)) {
        unit = await runSingleQuery(
          `SELECT u.id, u.propertyid, u.tenant_id
           FROM property_units u
           WHERE UPPER(u.unitnumber) = @code
           LIMIT 1`,
          { code: stripped }
        );
      }
    }

    let unitid = unit?.id || null;
    let propertyid = unit?.propertyid || null;
    let tenantId = unit?.tenant_id || null;
    let renteeid = null;

    if (!unitid) {
      const bucketName = guessBucketFromUnitCode(unitCode, tenantNick);
      const bucket = state.bucketFor(bucketName);
      propertyid = bucket.id;
      tenantId = bucket.tenantId;
      const unitnumber = normalizeUnitNumber(unitCode);
      const isCorporate = upper(tenantNick) === 'TECHONE'
        || upper(tenantNick).includes('PVT')
        || upper(tenantNick).includes('LIMITED');
      const rentRow = findExpenseRow(rows, 'RENT');
      const rent = rentRow != null ? toNumber(rows[rentRow]?.[col]) : null;
      unitid = await upsertPropertyUnit(state, {
        tenantId,
        propertyid,
        unitnumber,
        description: 'Synthesized from Sheet 2 (no Sheet 1 row)',
        status: 'occupied',
        squarefeet: null
      });
      state.synthesizedFromSheet2.push({ unitCode: unitnumber, bucket: bucketName, tenant: tenantNick });
      if (tenantNick) {
        renteeid = await upsertRentee(state, {
          tenantId,
          nic: null,
          name: tenantNick,
          phone: null,
          permanentAddress: null,
          propertyid,
          isCorporate
        });
        await upsertAgreement(state, {
          tenantId,
          propertyid,
          unitid,
          renteeid,
          rentamount: rent,
          depositamount: null,
          periodText: null,
          legacyRef: `sheet2:${unitCode}`,
          salesCommission: null,
          occupancyStatus: 'OCCUPIED'
        });
      }
    } else {
      const agreement = await runSingleQuery(
        `SELECT renteeid FROM agreements
         WHERE tenant_id = @tenantId AND unitid = @unitid AND status IN ('draft','signed')
         ORDER BY createdat DESC LIMIT 1`,
        { tenantId, unitid }
      );
      renteeid = agreement?.renteeid || null;
    }

    if (!renteeid) {
      state.log('info', `Sheet 2 col ${col} (${unitCode}): no rentee — skipping invoice`);
      continue;
    }

    const components = {};
    let totalamount = 0;
    let paidAmount = null;
    for (let r = 3; r < rows.length; r++) {
      const label = trim(rows[r]?.[0]);
      if (!label) continue;
      const amount = toNumber(rows[r]?.[col]);
      const upperLabel = upper(label);
      if (upperLabel === 'PAID AMOUNT') {
        paidAmount = amount;
        continue;
      }
      if (upperLabel.endsWith('TOTAL') || upperLabel === 'TOTAL') continue;
      if (amount != null) {
        components[label] = amount;
        totalamount += amount;
      }
    }

    if (Object.keys(components).length === 0) continue;

    const status = paidAmount != null && totalamount > 0 && Math.abs(paidAmount - totalamount) < 0.01
      ? 'paid'
      : 'pending';

    await upsertInvoice(state, {
      tenantId,
      propertyid,
      renteeid,
      billingperiod: billingPeriod || `sheet2:${unitCode}`,
      components,
      totalamount,
      status
    });
  }
};

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

const printSummary = (state) => {
  console.log('\n=== Import Summary ===');
  for (const [table, c] of Object.entries(state.counts)) {
    const parts = Object.entries(c).map(([k, v]) => `${k}=${v}`).join(' ');
    console.log(`${table.padEnd(18)} ${parts}`);
  }
  if (state.skippedRows.length) {
    console.log(`\nSkipped Sheet 1 rows: ${state.skippedRows.length}`);
    console.log(`  reasons: ${summarizeReasons(state.skippedRows.map((r) => r.reason))}`);
  }
  if (state.unassignedRows.length) {
    console.log(`\nUnassigned rows (need manual triage): ${state.unassignedRows.length}`);
    console.log(`  cities: ${summarizeReasons(state.unassignedRows.map((r) => upper(r.city) || '<blank>'))}`);
  }
  if (state.synthesizedFromSheet2.length) {
    console.log(`\nUnits synthesized from Sheet 2: ${state.synthesizedFromSheet2.length}`);
    state.synthesizedFromSheet2.forEach((s) => {
      console.log(`  ${s.unitCode} -> ${s.bucket} (rentee: ${s.tenant || 'unknown'})`);
    });
  }
  console.log(state.dryRun ? '\n(dry-run — no changes were written)\n' : '\nDone.\n');
};

const main = async () => {
  const args = parseArgs();
  console.log(`Reading ${args.file}${args.dryRun ? ' (dry-run)' : ''} sheets=${args.sheet}`);

  const workbook = xlsx.readFile(args.file, { cellDates: true });

  // Pre-state shell to allow ensureTenant/upsertPropertyBucket dry-run logging.
  const shellState = new ImportState({ dryRun: args.dryRun, tenantIdsBySlug: {}, bucketIds: {} });
  const tenantIdsBySlug = await resolveTenantIds(shellState);
  shellState.tenantIdsBySlug = tenantIdsBySlug;

  shellState.log('info', `tenant ids: ${Object.entries(tenantIdsBySlug).map(([k, v]) => `${k}=${v}`).join(', ')}`);

  await purgePlaceholderUnits(shellState);

  const bucketIds = await seedAllBuckets(shellState);
  shellState.bucketIds = bucketIds;

  if (args.sheet === '1' || args.sheet === 'all') {
    await ingestSheet1(shellState, workbook);
  }
  if (args.sheet === '2' || args.sheet === 'all') {
    await ingestSheet2(shellState, workbook);
  }

  printSummary(shellState);
};

main()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n[fatal]', err);
    await closePool().catch(() => {});
    process.exit(1);
  });
