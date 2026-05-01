import { runQuery, runSingleQuery } from '$api/db/query.js';
import { fail, redirect } from '@sveltejs/kit';
import crypto from 'crypto';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { rentees: [], properties: [] };

	let rentees = [];
	let properties = [];

	try {
		[rentees, properties] = await Promise.all([
			runQuery(
				`SELECT id, name, email
				 FROM app_users
				 WHERE tenant_id = ANY(@orgs::uuid[])
				 ORDER BY name ASC`,
				{ orgs }
			),
			runQuery(
				`SELECT id, name, address
				 FROM properties
				 WHERE tenant_id = ANY(@orgs::uuid[])
				 ORDER BY name ASC`,
				{ orgs }
			)
		]);
	} catch (err) {
		console.error('[Invoice Generate] Load error:', err.message);
	}

	return { rentees, properties };
};

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const tenantId = locals.tenantId;

		if (!tenantId) {
			return fail(403, { error: 'No tenant context' });
		}

		const formData = await request.formData();
		const propertyid = formData.get('propertyid')?.toString().trim();
		const renteeid = formData.get('renteeid')?.toString().trim();
		const billingperiod = formData.get('billingperiod')?.toString().trim();
		const duedate = formData.get('duedate')?.toString().trim();
		const notes = formData.get('notes')?.toString().trim() || null;
		const componentsRaw = formData.get('components')?.toString();

		if (!propertyid || !renteeid || !billingperiod || !duedate) {
			return fail(400, {
				error: 'Property, rentee, billing period, and due date are required.',
				propertyid,
				renteeid,
				billingperiod,
				duedate,
				notes,
				components: componentsRaw
			});
		}

		let components = [];
		try {
			components = componentsRaw ? JSON.parse(componentsRaw) : [];
		} catch {
			return fail(400, {
				error: 'Invalid components data.',
				propertyid,
				renteeid,
				billingperiod,
				duedate,
				notes
			});
		}

		components = components.filter(
			(c) => c.description && c.description.trim() && Number(c.amount) > 0
		);
		const totalamount = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);

		if (totalamount <= 0) {
			return fail(400, {
				error: 'At least one component with a valid amount is required.',
				propertyid,
				renteeid,
				billingperiod,
				duedate,
				notes,
				components: componentsRaw
			});
		}

		const invoiceId = crypto.randomUUID();

		try {
			await runSingleQuery(
				`INSERT INTO invoices (id, renteeid, propertyid, billingperiod, components, totalamount, status, duedate, notes, tenant_id, createdat, updatedat)
				 VALUES (@id, @renteeid, @propertyid, @billingperiod, @components::jsonb, @totalamount, 'pending', @duedate, @notes, @tenantId, NOW(), NOW())`,
				{
					id: invoiceId,
					renteeid,
					propertyid,
					billingperiod,
					components: JSON.stringify(components),
					totalamount,
					duedate,
					notes,
					tenantId
				}
			);
		} catch (err) {
			console.error('[Invoice Generate] Insert error:', err.message);
			return fail(500, {
				error: 'Failed to create invoice. Please try again.',
				propertyid,
				renteeid,
				billingperiod,
				duedate,
				notes,
				components: componentsRaw
			});
		}

		throw redirect(303, `/invoices/${invoiceId}`);
	}
};
