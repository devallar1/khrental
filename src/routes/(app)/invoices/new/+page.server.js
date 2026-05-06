import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error, fail, redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { getActiveBillingConfig } from '$lib/billing/activeConfig.js';
import { buildInvoiceComponents } from '$lib/billing/calc.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ url, locals }) => {
	const tenantId = url.searchParams.get('tenantId');
	const unitId = url.searchParams.get('unitId');
	const propertyId = url.searchParams.get('propertyId');

	if (!tenantId) throw error(400, 'tenantId query param required');

	const orgs = await visibleOrgIds(locals.user);

	// Tenant identity + property + unit + active agreement + bank profile in
	// a single join. We require an active agreement so rent + currency are
	// known; if the unit has no active tenancy we still let the manager
	// proceed but rent will be 0 and they'll need to fill in everything
	// manually.
	const tenant = await runSingleQuery(
		`SELECT t.id, t.name, t.email,
		        t.contact_details->>'phone' AS phone,
		        t.contact_details->>'address' AS address,
		        t.org_id
		 FROM tenants t
		 WHERE t.id = @tenantId`,
		{ tenantId }
	);
	if (!tenant) throw error(404, 'Tenant not found');
	if (orgs.length > 0 && tenant.org_id && !orgs.includes(tenant.org_id)) {
		throw error(403, 'Not authorised for this tenant');
	}

	// Resolve unit + property. Prefer the explicit unitId from the manager
	// dashboard; fall back to whatever active agreement the tenant has.
	let unit = null;
	let property = null;
	let agreement = null;

	if (unitId) {
		unit = await runSingleQuery(
			`SELECT u.id, u.unitnumber, u.propertyid, u.bank_profile_id,
			        bp.label AS bank_label, bp.account_holder_name, bp.account_number,
			        bp.bank_name, bp.branch
			 FROM property_units u
			 LEFT JOIN bank_profiles bp ON bp.id = u.bank_profile_id
			 WHERE u.id = @unitId`,
			{ unitId }
		);
	}

	const effectivePropertyId = unit?.propertyid || propertyId;
	if (effectivePropertyId) {
		property = await runSingleQuery(
			`SELECT id, name, address, owner_org_id, currency
			 FROM properties WHERE id = @propertyId`,
			{ propertyId: effectivePropertyId }
		);
	}

	// Latest active agreement for this tenant on this unit (or any active one
	// if unit not provided).
	if (unit) {
		agreement = await runSingleQuery(
			`SELECT id, rentamount, currency, startdate, enddate
			 FROM agreements
			 WHERE tenant_id = @tenantId AND unitid = @unitId
			   AND status IN ('signed','active')
			 ORDER BY startdate DESC
			 LIMIT 1`,
			{ tenantId, unitId: unit.id }
		);
	}
	if (!agreement) {
		agreement = await runSingleQuery(
			`SELECT id, rentamount, currency, startdate, enddate
			 FROM agreements
			 WHERE tenant_id = @tenantId AND status IN ('signed','active')
			 ORDER BY startdate DESC
			 LIMIT 1`,
			{ tenantId }
		);
	}

	// Org name for the invoice header.
	let orgName = null;
	if (property?.owner_org_id) {
		const org = await runSingleQuery(
			`SELECT name FROM organizations WHERE id = @orgId`,
			{ orgId: property.owner_org_id }
		);
		orgName = org?.name || null;
	}

	// Active billing config + latest 2 readings per utility for prefill.
	const today = new Date();
	const billingConfig = await getActiveBillingConfig(agreement?.id, today);

	const elecReadings = await runQuery(
		`SELECT currentreading, readingdate
		 FROM utility_readings
		 WHERE tenant_id = @tenantId AND utilitytype = 'electricity'
		 ORDER BY readingdate DESC, createdat DESC
		 LIMIT 2`,
		{ tenantId }
	);
	const waterReadings = await runQuery(
		`SELECT currentreading, readingdate
		 FROM utility_readings
		 WHERE tenant_id = @tenantId AND utilitytype = 'water'
		 ORDER BY readingdate DESC, createdat DESC
		 LIMIT 2`,
		{ tenantId }
	);

	const elecCurrent = Number(elecReadings[0]?.currentreading) || 0;
	const elecPrev = Number(elecReadings[1]?.currentreading) || 0;
	const waterCurrent = Number(waterReadings[0]?.currentreading) || 0;
	const waterPrev = Number(waterReadings[1]?.currentreading) || 0;

	const built = buildInvoiceComponents(billingConfig, {
		rentAmount: Number(agreement?.rentamount) || 0,
		electricity: { currentReading: elecCurrent, prevReading: elecPrev },
		water: { currentReading: waterCurrent, prevReading: waterPrev },
		slt: { passthroughLkr: null }
	});

	const billingPeriod = today.toISOString().slice(0, 7); // YYYY-MM
	const dueDate = new Date(today.getTime() + 14 * 86400 * 1000).toISOString().slice(0, 10);
	const currency = agreement?.currency || property?.currency || 'LKR';

	return {
		tenant,
		property,
		unit,
		agreement,
		orgName,
		billingConfig,
		prefill: {
			components: built.components,
			total: built.total,
			elecCurrent,
			elecPrev,
			waterCurrent,
			waterPrev,
			billingPeriod,
			dueDate,
			currency
		}
	};
};

/** @type {import('./$types').Actions} */
export const actions = {
	saveDraft: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });

		const fd = await request.formData();
		const tenantId = String(fd.get('tenantId') || '').trim();
		const propertyid = String(fd.get('propertyId') || '').trim() || null;
		const billingperiod = String(fd.get('billingPeriod') || '').trim();
		const duedate = String(fd.get('dueDate') || '').trim();
		const currency = String(fd.get('currency') || 'LKR').trim().toUpperCase();
		const notes = String(fd.get('notes') || '').trim() || null;
		const componentsRaw = String(fd.get('components') || '[]');

		if (!tenantId || !billingperiod || !duedate) {
			return fail(400, { error: 'Missing required fields' });
		}

		let components = [];
		try {
			components = JSON.parse(componentsRaw);
			if (!Array.isArray(components)) components = [];
		} catch {
			return fail(400, { error: 'Invalid components payload' });
		}

		components = components
			.map((c) => ({
				description: String(c?.description || '').trim(),
				amount: Number(c?.amount || 0)
			}))
			.filter((c) => c.description && Number.isFinite(c.amount) && c.amount !== 0);

		const totalamount = components.reduce((s, c) => s + c.amount, 0);

		const id = crypto.randomUUID();

		try {
			await runSingleQuery(
				`INSERT INTO invoices (
				   id, tenant_id, propertyid, billingperiod, components,
				   totalamount, status, duedate, notes, currency,
				   createdat, updatedat
				 ) VALUES (
				   @id, @tenantId, @propertyid, @billingperiod, @components::jsonb,
				   @totalamount, 'draft', @duedate, @notes, @currency,
				   NOW(), NOW()
				 )`,
				{
					id,
					tenantId,
					propertyid,
					billingperiod,
					components: JSON.stringify(components),
					totalamount,
					duedate,
					notes,
					currency
				}
			);

			await runSingleQuery(
				`INSERT INTO invoice_audit_log (invoice_id, user_id, action, snapshot)
				 VALUES (@invoiceId, @userId, 'created', @snapshot::jsonb)`,
				{
					invoiceId: id,
					userId: locals.user.id,
					snapshot: JSON.stringify({
						components,
						totalamount,
						notes,
						status: 'draft',
						billingperiod,
						duedate,
						currency
					})
				}
			);
		} catch (err) {
			console.error('[Invoice New] Insert error:', err.message);
			return fail(500, { error: 'Failed to create draft invoice' });
		}

		throw redirect(303, `/invoices/${id}`);
	}
};
