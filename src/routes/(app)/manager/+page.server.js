import { runQuery, runSingleQuery, withTransaction } from '$api/db/query.js';
import { fail } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { getActiveBillingConfig, agreementHasBillingConfig } from '$lib/billing/activeConfig.js';
import { buildInvoiceComponents } from '$lib/billing/calc.js';
import { parseBillingConfig } from '$lib/billing/config.js';
import { assertSysadmin } from '$lib/server/authz.js';

/**
 * Manager dashboard: cross-tenant view for the people running the show
 * (Liswith / Devalla / Ravi). Lists every property under every active
 * tenant, with each unit's current resident + quick stats.
 *
 * Privileged route — sysadmin only. Phase 1 will narrow this to a strict
 * sysadmin check; Phase 2 routes most managerial work through the
 * regular pages with proper ownership/membership checks instead.
 */
export const load = async ({ locals }) => {
	assertSysadmin(locals.user);

	const properties = await runQuery(
		`SELECT p.id, p.name, p.address, p.propertytype, p.description,
		        p.owner_org_id AS tenant_id, o.name AS tenant_name, o.slug AS tenant_slug,
		        p.bank_name, p.electricity_rate, p.water_rate,
		        p.latitude, p.longitude, p.boundary_geojson
		 FROM properties p
		 LEFT JOIN organizations o ON o.id = p.owner_org_id
		 WHERE p.owner_org_id IS NULL OR o.status = 'active'
		 ORDER BY COALESCE(o.name, '~~personal'), p.name`
	);

	const units = await runQuery(
		`SELECT u.id, u.unitnumber, u.propertyid, u.status, u.bedrooms, u.bathrooms,
		        u.squarefeet, u.description AS unit_description,
		        u.bank_profile_id,
		        bp.label AS bank_profile_label,
		        a.id AS agreement_id, a.status AS agreement_status,
		        a.rentamount, a.depositamount, a.startdate, a.enddate,
		        au.id AS rentee_id, au.name AS rentee_name, au.email AS rentee_email,
		        au.national_id AS rentee_nic,
		        au.contact_details AS rentee_contact_details,
		        be.config AS billing_config,
		        be.meter_readings AS billing_meter_readings,
		        be.effective_from AS billing_effective_from
		 FROM property_units u
		 LEFT JOIN bank_profiles bp ON bp.id = u.bank_profile_id
		 LEFT JOIN LATERAL (
		   SELECT * FROM agreements ag
		   WHERE ag.unitid = u.id AND ag.status IN ('signed','active','draft')
		   ORDER BY
		     CASE ag.status WHEN 'signed' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
		     ag.createdat DESC
		   LIMIT 1
		 ) a ON TRUE
		 LEFT JOIN LATERAL (
		   SELECT config, meter_readings, effective_from
		     FROM agreement_billing_events
		    WHERE agreement_id = a.id
		    ORDER BY effective_from DESC, createdat DESC
		    LIMIT 1
		 ) be ON TRUE
		 LEFT JOIN rentees au ON au.id = a.renteeid
		 ORDER BY u.unitnumber`
	);

	const latestReadings = await runQuery(
		`SELECT DISTINCT ON (renteeid)
		        renteeid, currentreading, readingdate, calculatedbill, status
		 FROM utility_readings
		 WHERE utilitytype = 'electricity'
		 ORDER BY renteeid, readingdate DESC, createdat DESC`
	);
	const readingByRenteeId = new Map(latestReadings.map((r) => [r.renteeid, r]));

	const latestInvoices = await runQuery(
		`SELECT DISTINCT ON (renteeid)
		        renteeid, billingperiod, totalamount, status, duedate, createdat
		 FROM invoices
		 ORDER BY renteeid, createdat DESC`
	);
	const invoiceByRenteeId = new Map(latestInvoices.map((r) => [r.renteeid, r]));

	const unitsByPropertyId = new Map();
	for (const u of units) {
		const phone = (() => {
			try {
				const cd = typeof u.rentee_contact_details === 'string'
					? JSON.parse(u.rentee_contact_details)
					: u.rentee_contact_details;
				return cd?.phone || null;
			} catch { return null; }
		})();
		const enriched = {
			...u,
			rentee_phone: phone,
			latest_reading: u.rentee_id ? readingByRenteeId.get(u.rentee_id) || null : null,
			latest_invoice: u.rentee_id ? invoiceByRenteeId.get(u.rentee_id) || null : null
		};
		const list = unitsByPropertyId.get(u.propertyid) || [];
		list.push(enriched);
		unitsByPropertyId.set(u.propertyid, list);
	}

	const realm = properties.map((p) => ({
		...p,
		units: unitsByPropertyId.get(p.id) || []
	}));

	// Rentees for the contact-book panel. Cross-tenant like the rest of the
	// manager view. We keep archived (active=false) ones in the result so the
	// drawer can offer "show archived"; the default UI hides them.
	const renteeRows = await runQuery(
		`SELECT id, name, email, contact_details, national_id,
		        permanent_address, notes, active, tenant_id, createdat
		 FROM rentees
		 ORDER BY active DESC, name`
	);
	const rentees = renteeRows.map((r) => {
		let phone = null;
		try {
			const cd = typeof r.contact_details === 'string'
				? JSON.parse(r.contact_details)
				: r.contact_details;
			phone = cd?.phone || null;
		} catch {}
		return {
			id: r.id,
			name: r.name,
			email: r.email,
			phone,
			national_id: r.national_id,
			permanent_address: r.permanent_address,
			notes: r.notes,
			active: r.active,
			tenant_id: r.tenant_id
		};
	});

	// Shared canvas state (card positions, sticky notes, districts) for the
	// whole manager team. Last-write-wins; the API endpoint at
	// /api/manager/canvas handles saves and cross-tab sync. See migrations
	// 20260430_01 / 20260430_02.
	let canvasState = {};
	let canvasUpdatedAt = null;
	if (locals?.user?.id) {
		const canvasRow = await runSingleQuery(
			`SELECT state, updated_at FROM manager_canvas_states WHERE scope = @scope`,
			{ scope: 'shared' }
		);
		if (canvasRow) {
			canvasState = canvasRow.state || {};
			canvasUpdatedAt =
				canvasRow.updated_at instanceof Date
					? canvasRow.updated_at.toISOString()
					: canvasRow.updated_at || null;
		}
	}

	// Bank profiles for the new-tenant wizard's bank-routing step.
	const bankProfiles = await runQuery(
		`SELECT bp.id, bp.owner_org_id AS tenant_id, bp.label, bp.account_holder_name, bp.account_number,
		        bp.bank_name, bp.branch
		   FROM bank_profiles bp
		   LEFT JOIN organizations o ON o.id = bp.owner_org_id
		  WHERE bp.active = TRUE
		    AND (bp.owner_org_id IS NULL OR o.status = 'active')
		  ORDER BY bp.label`
	);

	return { realm, rentees, canvasState, canvasUpdatedAt, bankProfiles };
};

const numericForm = (formData, key) => {
	const v = formData.get(key);
	if (v == null || v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
};

export const actions = {
	enterReading: async ({ request, locals }) => {
		const tenantId = locals.tenantId;
		const fd = await request.formData();
		const unitId = String(fd.get('unitId') || '');
		const propertyId = String(fd.get('propertyId') || '');
		const renteeId = String(fd.get('renteeId') || '');
		const currentReading = numericForm(fd, 'currentReading');
		if (!unitId || !propertyId || !renteeId || currentReading == null) {
			return fail(400, { error: 'Missing reading data' });
		}

		const previous = await runSingleQuery(
			`SELECT currentreading FROM utility_readings
			 WHERE renteeid = @renteeId AND utilitytype = 'electricity'
			 ORDER BY readingdate DESC, createdat DESC LIMIT 1`,
			{ renteeId }
		);

		const property = await runSingleQuery(
			`SELECT electricity_rate FROM properties WHERE id = @propertyId LIMIT 1`,
			{ propertyId }
		);
		const rate = Number(property?.electricity_rate) || 0;
		const previousReading = Number(previous?.currentreading) || 0;
		const consumed = Math.max(0, currentReading - previousReading);
		const calculatedBill = +(consumed * rate).toFixed(2);

		const id = crypto.randomUUID();
		await runQuery(
			`INSERT INTO utility_readings (
			   id, renteeid, propertyid, utilitytype, previousreading, currentreading,
			   readingdate, calculatedbill, status, createdat, updatedat
			 ) VALUES (
			   @id, @renteeId, @propertyId, 'electricity', @previousReading, @currentReading,
			   CURRENT_DATE, @calculatedBill, 'pending', NOW(), NOW()
			 )`,
			{ id, renteeId, propertyId, previousReading, currentReading, calculatedBill }
		);

		return { ok: true, action: 'enterReading', consumed, calculatedBill };
	},

	sendInvoice: async ({ request, locals }) => {
		const tenantId = locals.tenantId;
		const fd = await request.formData();
		const unitId = String(fd.get('unitId') || '');
		const propertyId = String(fd.get('propertyId') || '');
		const renteeId = String(fd.get('renteeId') || '');
		const agreementId = String(fd.get('agreementId') || '');
		// Optional manager-entered SLT pass-through amount for the period
		const sltPassthroughRaw = fd.get('sltPassthroughLkr');
		const sltPassthroughLkr = sltPassthroughRaw != null && sltPassthroughRaw !== ''
			? Number(sltPassthroughRaw)
			: null;
		if (!unitId || !propertyId || !renteeId) return fail(400, { error: 'Missing invoice data' });

		const agreement = await runSingleQuery(
			`SELECT rentamount FROM agreements WHERE id = @agreementId LIMIT 1`,
			{ agreementId }
		);
		const rent = Number(agreement?.rentamount) || 0;

		const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
		const periodStart = `${billingPeriod}-01`;

		const useNewPath = agreementId && (await agreementHasBillingConfig(agreementId));

		let components;
		let totalamount;

		if (useNewPath) {
			const config = await getActiveBillingConfig(agreementId, periodStart);

			// Pull the latest two electricity / water readings so unit-based modes
			// can compute consumed units. Solar-offset only needs the latest one.
			const elecReadings = await runQuery(
				`SELECT currentreading FROM utility_readings
				   WHERE renteeid = @renteeId AND utilitytype = 'electricity'
				   ORDER BY readingdate DESC, createdat DESC
				   LIMIT 2`,
				{ renteeId }
			);
			const waterReadings = await runQuery(
				`SELECT currentreading FROM utility_readings
				   WHERE renteeid = @renteeId AND utilitytype = 'water'
				   ORDER BY readingdate DESC, createdat DESC
				   LIMIT 2`,
				{ renteeId }
			);

			const built = buildInvoiceComponents(config, {
				rentAmount: rent,
				electricity: {
					currentReading: Number(elecReadings[0]?.currentreading) || 0,
					prevReading: Number(elecReadings[1]?.currentreading) || 0
				},
				water: {
					currentReading: Number(waterReadings[0]?.currentreading) || 0,
					prevReading: Number(waterReadings[1]?.currentreading) || 0
				},
				slt: { passthroughLkr: sltPassthroughLkr }
			});

			components = built.components;
			totalamount = built.total;
		} else {
			// Legacy path — kept so agreements with no billing events keep
			// generating invoices identically until they're migrated.
			const reading = await runSingleQuery(
				`SELECT calculatedbill FROM utility_readings
				   WHERE renteeid = @renteeId AND utilitytype = 'electricity'
				   ORDER BY readingdate DESC, createdat DESC LIMIT 1`,
				{ renteeId }
			);
			const electricity = Number(reading?.calculatedbill) || 0;
			const flat = { RENT: rent };
			if (electricity > 0) flat.ELECTRICITY = electricity;
			components = flat;
			totalamount = rent + electricity;
		}

		const id = crypto.randomUUID();
		await runQuery(
			`INSERT INTO invoices (
			   id, renteeid, propertyid, billingperiod, components,
			   totalamount, status, createdat, updatedat
			 ) VALUES (
			   @id, @renteeId, @propertyId, @billingPeriod, @components,
			   @totalamount, 'pending', NOW(), NOW()
			 )`,
			{
				id,
				renteeId,
				propertyId,
				billingPeriod,
				components: JSON.stringify(components),
				totalamount
			}
		);

		return { ok: true, action: 'sendInvoice', invoiceId: id, totalamount };
	},

	// ── Rentee CRUD (powers the contact-book drawer) ────────────────────
	createRentee: async ({ request, locals }) => {
		const fd = await request.formData();
		const name = String(fd.get('name') || '').trim();
		if (!name) return fail(400, { action: 'createRentee', error: 'Name is required' });

		const email = String(fd.get('email') || '').trim() || null;
		const phone = String(fd.get('phone') || '').trim() || null;
		const national_id = String(fd.get('national_id') || '').trim() || null;
		const permanent_address = String(fd.get('permanent_address') || '').trim() || null;
		const notes = String(fd.get('notes') || '').trim() || null;
		const tenantId = locals.tenantId || null;

		const id = crypto.randomUUID();
		const contactDetails = phone ? JSON.stringify({ phone }) : null;

		await runQuery(
			`INSERT INTO rentees (
				id, name, email, contact_details, national_id, permanent_address,
				notes, tenant_id, active, createdat, updatedat
			) VALUES (
				@id, @name, @email, @contactDetails, @national_id, @permanent_address,
				@notes, @tenantId, TRUE, NOW(), NOW()
			)`,
			{ id, name, email, contactDetails, national_id, permanent_address, notes, tenantId }
		);

		return { ok: true, action: 'createRentee', id };
	},

	updateRentee: async ({ request }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') || '').trim();
		const name = String(fd.get('name') || '').trim();
		if (!id || !name) return fail(400, { action: 'updateRentee', error: 'Missing id or name' });

		const email = String(fd.get('email') || '').trim() || null;
		const phone = String(fd.get('phone') || '').trim() || null;
		const national_id = String(fd.get('national_id') || '').trim() || null;
		const permanent_address = String(fd.get('permanent_address') || '').trim() || null;
		const notes = String(fd.get('notes') || '').trim() || null;
		const contactDetails = phone ? JSON.stringify({ phone }) : null;

		await runQuery(
			`UPDATE rentees
			 SET name = @name, email = @email, contact_details = @contactDetails,
			     national_id = @national_id, permanent_address = @permanent_address,
			     notes = @notes, updatedat = NOW()
			 WHERE id = @id`,
			{ id, name, email, contactDetails, national_id, permanent_address, notes }
		);

		return { ok: true, action: 'updateRentee', id };
	},

	// Soft delete — flips `active` to false. Keeps history intact (FKs from
	// agreements / invoices / action_records stay valid).
	archiveRentee: async ({ request }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') || '').trim();
		if (!id) return fail(400, { action: 'archiveRentee', error: 'Missing id' });

		await runQuery(
			`UPDATE rentees SET active = FALSE, updatedat = NOW() WHERE id = @id`,
			{ id }
		);

		return { ok: true, action: 'archiveRentee', id };
	},

	restoreRentee: async ({ request }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') || '').trim();
		if (!id) return fail(400, { action: 'restoreRentee', error: 'Missing id' });

		await runQuery(
			`UPDATE rentees SET active = TRUE, updatedat = NOW() WHERE id = @id`,
			{ id }
		);

		return { ok: true, action: 'restoreRentee', id };
	},

	// End the active tenancy on a given unit. Sets the agreement status to
	// 'terminated' and stamps end-date = today. The rentee row in app_users
	// stays intact; only this particular tenancy is closed.
	endTenancy: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { action: 'endTenancy', error: 'Not authenticated' });
		const fd = await request.formData();
		const unitId = String(fd.get('unitId') || '').trim();
		if (!unitId) return fail(400, { action: 'endTenancy', error: 'Missing unit id' });

		try {
			await runQuery(
				`UPDATE agreements
				    SET status = 'terminated',
				        enddate = CURRENT_DATE,
				        updatedat = NOW()
				  WHERE unitid = @unitId
				    AND status IN ('signed', 'active', 'draft')`,
				{ unitId }
			);
		} catch (err) {
			console.error('[endTenancy]', err);
			return fail(500, { action: 'endTenancy', error: 'Failed to end tenancy' });
		}
		return { ok: true, action: 'endTenancy' };
	},

	// Re-route a unit to a different bank profile (or clear the routing).
	// Profile must belong to the same tenant org as the unit's property.
	setBankProfile: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { action: 'setBankProfile', error: 'Not authenticated' });
		const fd = await request.formData();
		const unit_id = String(fd.get('unit_id') || '').trim();
		const bank_profile_id = String(fd.get('bank_profile_id') || '').trim() || null;
		if (!unit_id) return fail(400, { action: 'setBankProfile', error: 'Missing unit id' });

		if (bank_profile_id) {
			const ok = await runSingleQuery(
				`SELECT 1 AS ok
				   FROM property_units u
				   JOIN properties p ON p.id = u.propertyid
				   JOIN bank_profiles bp ON bp.id = @bank_profile_id
				  WHERE u.id = @unit_id
				    AND (
				      (bp.owner_org_id IS NOT NULL AND bp.owner_org_id = p.owner_org_id)
				      OR (bp.owner_user_id IS NOT NULL AND bp.owner_user_id = p.owner_user_id)
				    )
				  LIMIT 1`,
				{ unit_id, bank_profile_id }
			);
			if (!ok) return fail(400, { action: 'setBankProfile', error: 'Profile does not belong to this property\'s owner' });
		}

		try {
			await runQuery(
				`UPDATE property_units
				    SET bank_profile_id = @bank_profile_id, updatedat = NOW()
				  WHERE id = @unit_id`,
				{ unit_id, bank_profile_id }
			);
		} catch (err) {
			console.error('[setBankProfile]', err);
			return fail(500, { action: 'setBankProfile', error: 'Failed to update bank routing' });
		}
		return { ok: true, action: 'setBankProfile' };
	},

	// ── New-tenant wizard: rentee + agreement + initial billing event ──
	// Wrapped in a single Postgres transaction so partial failures roll back
	// cleanly — if the billing-event INSERT fails (e.g. FK violation), the
	// rentee + agreement INSERTs preceding it are undone in the same step.
	createTenantWithAgreement: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { action: 'createTenant', error: 'Not authenticated' });

		const fd = await request.formData();

		// Reuse path: when the wizard's existing-tenant search picked someone,
		// the form carries the existing app_users.id. We skip the identity
		// INSERT and just stitch the new agreement onto that row.
		const existingRenteeId = String(fd.get('existing_rentee_id') || '').trim() || null;

		// Identity (only consumed in the "create-new" branch)
		const name = String(fd.get('name') || '').trim();
		if (!existingRenteeId && !name) {
			return fail(400, { action: 'createTenant', error: 'Name is required' });
		}
		const email = String(fd.get('email') || '').trim() || null;
		const phone = String(fd.get('phone') || '').trim() || null;
		const national_id = String(fd.get('national_id') || '').trim() || null;
		const permanent_address = String(fd.get('permanent_address') || '').trim() || null;
		const notes = String(fd.get('notes') || '').trim() || null;

		// Tenancy
		const property_id = String(fd.get('property_id') || '').trim();
		const unit_id = String(fd.get('unit_id') || '').trim();
		const start_date = String(fd.get('start_date') || '').trim();
		const end_date = String(fd.get('end_date') || '').trim() || null;
		const rentAmount = numericForm(fd, 'rent_amount') ?? 0;
		const depositAmount = numericForm(fd, 'deposit_amount') ?? 0;
		const bank_profile_id = String(fd.get('bank_profile_id') || '').trim() || null;

		if (!property_id || !unit_id || !start_date) {
			return fail(400, { action: 'createTenant', error: 'Property, unit, and start date are required' });
		}

		// Resolve the property's owning org — the rentee inherits this for
		// the staff "address book" scope. (User-owned properties have no
		// org context; the rentee row's tenant_id stays null in that case.)
		const property = await runSingleQuery(
			`SELECT owner_org_id, owner_user_id FROM properties WHERE id = @property_id LIMIT 1`,
			{ property_id }
		);
		if (!property) {
			return fail(400, { action: 'createTenant', error: 'Property not found' });
		}
		const tenantId = property.owner_org_id || null;

		// Billing config — Zod-validated before any DB work.
		const billingConfigRaw = String(fd.get('billing_config') || '');
		let billingConfig;
		try {
			billingConfig = parseBillingConfig(JSON.parse(billingConfigRaw));
		} catch (err) {
			return fail(400, { action: 'createTenant', error: `Invalid billing config: ${err.message || err}` });
		}

		// Pull initial readings out of the config into a separate JSONB so the
		// events row carries them explicitly (config holds them too, but having
		// a flat shape on the event row makes "what was the meter at on day N"
		// queries trivial).
		const meterReadings = {};
		if (billingConfig.electricity?.mode === 'unit_based' || billingConfig.electricity?.mode === 'solar_offset') {
			meterReadings.electricity = billingConfig.electricity.initial_reading;
		}
		if (billingConfig.water?.mode === 'unit_based') {
			meterReadings.water = billingConfig.water.initial_reading;
		}

		const renteeId = existingRenteeId || crypto.randomUUID();
		const agreementId = crypto.randomUUID();
		const eventId = crypto.randomUUID();

		// `created_by` FK references auth_user(id), not app_users(id) — pull
		// the auth-side id from the session.
		const createdByAuthId = locals.session?.user?.id || locals.user?.auth_id || null;

		try {
			await withTransaction(async ({ runQuery, runSingleQuery }) => {
				if (existingRenteeId) {
					const existing = await runSingleQuery(
						`SELECT id FROM rentees WHERE id = @id AND active = TRUE LIMIT 1`,
						{ id: existingRenteeId }
					);
					if (!existing) throw new Error('Selected tenant no longer exists');
				} else {
					const contactDetails = phone ? JSON.stringify({ phone }) : null;
					await runQuery(
						`INSERT INTO rentees (
						    id, name, email, contact_details, national_id, permanent_address,
						    notes, tenant_id, active, status, createdat, updatedat
						 ) VALUES (
						    @id, @name, @email, @contactDetails::jsonb, @national_id, @permanent_address,
						    @notes, @tenantId, TRUE, 'active', NOW(), NOW()
						 )`,
						{ id: renteeId, name, email, contactDetails, national_id, permanent_address, notes, tenantId }
					);
				}

				await runQuery(
					`INSERT INTO agreements (
					    id, renteeid, propertyid, unitid, startdate, enddate,
					    rentamount, depositamount, status, createdat
					 ) VALUES (
					    @id, @renteeId, @propertyId, @unitId, @startDate, @endDate,
					    @rentAmount, @depositAmount, 'active', NOW()
					 )`,
					{
						id: agreementId,
						renteeId,
						propertyId: property_id,
						unitId: unit_id,
						startDate: start_date,
						endDate: end_date,
						rentAmount,
						depositAmount
					}
				);

				await runQuery(
					`INSERT INTO agreement_billing_events (
					    id, agreement_id, effective_from, config, meter_readings,
					    reason, created_by
					 ) VALUES (
					    @id, @agreementId, @effectiveFrom, @config::jsonb, @meterReadings::jsonb,
					    'Initial agreement', @createdBy
					 )`,
					{
						id: eventId,
						agreementId,
						effectiveFrom: start_date,
						config: JSON.stringify(billingConfig),
						meterReadings: JSON.stringify(meterReadings),
						createdBy: createdByAuthId
					}
				);

				if (bank_profile_id) {
					await runQuery(
						`UPDATE property_units
						    SET bank_profile_id = @bank_profile_id, updatedat = NOW()
						  WHERE id = @unit_id`,
						{ unit_id, bank_profile_id }
					);
				}
			});
		} catch (err) {
			console.error('[createTenantWithAgreement]', err);
			const msg = err?.message === 'Selected tenant no longer exists'
				? err.message
				: 'Failed to create tenant';
			return fail(500, { action: 'createTenant', error: msg });
		}

		return { ok: true, action: 'createTenant', renteeId, agreementId };
	},

	// Append a new billing-config event for an existing agreement. Used by
	// the "Edit billing" panel — historical events stay intact so we can
	// always reconstruct what config was active at any past invoice period.
	updateAgreementBilling: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { action: 'updateAgreementBilling', error: 'Not authenticated' });
		const fd = await request.formData();
		const agreementId = String(fd.get('agreement_id') || '').trim();
		const effectiveFrom = String(fd.get('effective_from') || '').trim();
		const reason = String(fd.get('reason') || '').trim() || 'Billing config update';
		if (!agreementId || !effectiveFrom) {
			return fail(400, { action: 'updateAgreementBilling', error: 'Agreement and effective date are required' });
		}

		let billingConfig;
		try {
			billingConfig = parseBillingConfig(JSON.parse(String(fd.get('billing_config') || '{}')));
		} catch (err) {
			return fail(400, { action: 'updateAgreementBilling', error: `Invalid billing config: ${err.message || err}` });
		}

		let meterReadings = {};
		try {
			const raw = String(fd.get('meter_readings') || '{}');
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === 'object') meterReadings = parsed;
		} catch {}

		const eventId = crypto.randomUUID();
		const createdByAuthId = locals.session?.user?.id || locals.user?.auth_id || null;

		try {
			await runSingleQuery(
				`SELECT 1 FROM agreements WHERE id = @id LIMIT 1`,
				{ id: agreementId }
			);
			await runQuery(
				`INSERT INTO agreement_billing_events (
				    id, agreement_id, effective_from, config, meter_readings,
				    reason, created_by
				 ) VALUES (
				    @id, @agreementId, @effectiveFrom, @config::jsonb, @meterReadings::jsonb,
				    @reason, @createdBy
				 )
				 ON CONFLICT (agreement_id, effective_from) DO UPDATE
				   SET config = EXCLUDED.config,
				       meter_readings = EXCLUDED.meter_readings,
				       reason = EXCLUDED.reason,
				       created_by = EXCLUDED.created_by`,
				{
					id: eventId,
					agreementId,
					effectiveFrom,
					config: JSON.stringify(billingConfig),
					meterReadings: JSON.stringify(meterReadings),
					reason,
					createdBy: createdByAuthId
				}
			);
		} catch (err) {
			console.error('[updateAgreementBilling]', err);
			return fail(500, { action: 'updateAgreementBilling', error: 'Failed to save billing config' });
		}

		return { ok: true, action: 'updateAgreementBilling', agreementId };
	}
};
