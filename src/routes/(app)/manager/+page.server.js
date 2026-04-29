import { runQuery, runSingleQuery } from '$api/db/query.js';
import { fail } from '@sveltejs/kit';
import crypto from 'node:crypto';

/**
 * Manager dashboard: cross-tenant view for the people running the show
 * (Liswith / Devalla / Ravi). Lists every property under every active
 * tenant, with each unit's current resident + quick stats.
 */
export const load = async () => {
	const properties = await runQuery(
		`SELECT p.id, p.name, p.address, p.propertytype, p.description,
		        p.tenant_id, t.name AS tenant_name, t.slug AS tenant_slug,
		        p.bank_name, p.electricity_rate, p.water_rate
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

	return { realm };
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
	}
};
