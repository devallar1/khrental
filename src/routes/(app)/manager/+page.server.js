import { runQuery, runSingleQuery } from '$api/db/query.js';
import { fail } from '@sveltejs/kit';
import crypto from 'node:crypto';

/**
 * Manager dashboard: cross-tenant view for the people running the show
 * (Liswith / Devalla / Ravi). Lists every property under every active
 * tenant, with each unit's current resident + quick stats.
 */
export const load = async ({ locals }) => {
	const properties = await runQuery(
		`SELECT p.id, p.name, p.address, p.propertytype, p.description,
		        p.tenant_id, t.name AS tenant_name, t.slug AS tenant_slug,
		        p.bank_name, p.electricity_rate, p.water_rate,
		        p.latitude, p.longitude, p.boundary_geojson
		 FROM properties p
		 JOIN tenants t ON t.id = p.tenant_id
		 WHERE t.status = 'active'
		 ORDER BY t.name, p.name`
	);

	const units = await runQuery(
		`SELECT u.id, u.unitnumber, u.propertyid, u.status, u.bedrooms, u.bathrooms,
		        u.squarefeet, u.description AS unit_description,
		        a.id AS agreement_id, a.status AS agreement_status,
		        a.rentamount, a.depositamount, a.startdate, a.enddate,
		        au.id AS rentee_id, au.name AS rentee_name, au.email AS rentee_email,
		        au.national_id AS rentee_nic,
		        au.contact_details AS rentee_contact_details
		 FROM property_units u
		 LEFT JOIN LATERAL (
		   SELECT * FROM agreements ag
		   WHERE ag.unitid = u.id AND ag.status IN ('signed','active','draft')
		   ORDER BY
		     CASE ag.status WHEN 'signed' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
		     ag.createdat DESC
		   LIMIT 1
		 ) a ON TRUE
		 LEFT JOIN app_users au ON au.id = a.renteeid
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
		 FROM app_users
		 WHERE COALESCE(user_type, 'rentee') = 'rentee'
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

	return { realm, rentees, canvasState, canvasUpdatedAt };
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
		if (!unitId || !propertyId || !renteeId) return fail(400, { error: 'Missing invoice data' });

		const agreement = await runSingleQuery(
			`SELECT rentamount FROM agreements WHERE id = @agreementId LIMIT 1`,
			{ agreementId }
		);
		const rent = Number(agreement?.rentamount) || 0;

		const reading = await runSingleQuery(
			`SELECT calculatedbill FROM utility_readings
			 WHERE renteeid = @renteeId AND utilitytype = 'electricity'
			 ORDER BY readingdate DESC, createdat DESC LIMIT 1`,
			{ renteeId }
		);
		const electricity = Number(reading?.calculatedbill) || 0;

		const components = { RENT: rent };
		if (electricity > 0) components.ELECTRICITY = electricity;
		const totalamount = rent + electricity;

		const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

		const id = crypto.randomUUID();
		const propertyTenant = await runSingleQuery(
			`SELECT tenant_id FROM properties WHERE id = @propertyId LIMIT 1`,
			{ propertyId }
		);
		const invoiceTenantId = propertyTenant?.tenant_id || tenantId;

		await runQuery(
			`INSERT INTO invoices (
			   id, tenant_id, renteeid, propertyid, billingperiod, components,
			   totalamount, status, createdat, updatedat
			 ) VALUES (
			   @id, @tenantId, @renteeId, @propertyId, @billingPeriod, @components,
			   @totalamount, 'pending', NOW(), NOW()
			 )`,
			{
				id, tenantId: invoiceTenantId, renteeId, propertyId, billingPeriod,
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
			`INSERT INTO app_users (
				id, name, email, contact_details, national_id, permanent_address,
				notes, user_type, tenant_id, active, createdat, updatedat
			) VALUES (
				@id, @name, @email, @contactDetails, @national_id, @permanent_address,
				@notes, 'rentee', @tenantId, TRUE, NOW(), NOW()
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
			`UPDATE app_users
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
			`UPDATE app_users SET active = FALSE, updatedat = NOW() WHERE id = @id`,
			{ id }
		);

		return { ok: true, action: 'archiveRentee', id };
	},

	restoreRentee: async ({ request }) => {
		const fd = await request.formData();
		const id = String(fd.get('id') || '').trim();
		if (!id) return fail(400, { action: 'restoreRentee', error: 'Missing id' });

		await runQuery(
			`UPDATE app_users SET active = TRUE, updatedat = NOW() WHERE id = @id`,
			{ id }
		);

		return { ok: true, action: 'restoreRentee', id };
	}
};
