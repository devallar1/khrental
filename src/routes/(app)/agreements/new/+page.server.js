import { runQuery, runSingleQuery } from '$api/db/query.js';
import { redirect, fail } from '@sveltejs/kit';
import crypto from 'crypto';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { rentees: [], properties: [], templates: [] };

	let rentees = [];
	let properties = [];
	let templates = [];

	try {
		[rentees, properties, templates] = await Promise.all([
			runQuery(
				`SELECT id, name, email FROM app_users
				 WHERE tenant_id = ANY(@orgs::uuid[]) ORDER BY name ASC`,
				{ orgs }
			),
			runQuery(
				`SELECT id, name, address FROM properties
				 WHERE tenant_id = ANY(@orgs::uuid[]) ORDER BY name ASC`,
				{ orgs }
			),
			runQuery(
				`SELECT id, name, language, version FROM agreement_templates
				 WHERE tenant_id = ANY(@orgs::uuid[]) ORDER BY name ASC`,
				{ orgs }
			)
		]);
	} catch (err) {
		console.error('[Agreements/New] Load error:', err.message);
	}

	return { rentees, properties, templates };
};

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const tenantId = locals.tenantId;
		if (!tenantId) {
			return fail(400, { error: 'No tenant context' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim() || '';
		const renteeid = formData.get('renteeid')?.toString() || null;
		const propertyid = formData.get('propertyid')?.toString() || null;
		const templateid = formData.get('templateid')?.toString() || null;
		const startdate = formData.get('startdate')?.toString() || null;
		const enddate = formData.get('enddate')?.toString() || null;
		const rentamount = formData.get('rentamount') ? parseFloat(formData.get('rentamount')) : null;
		const depositamount = formData.get('depositamount') ? parseFloat(formData.get('depositamount')) : null;
		const notes = formData.get('notes')?.toString().trim() || null;

		if (!title) {
			return fail(400, { error: 'Title is required', title, renteeid, propertyid, templateid, startdate, enddate, rentamount, depositamount, notes });
		}

		try {
			const id = crypto.randomUUID();
			const now = new Date().toISOString();

			await runSingleQuery(
				`INSERT INTO agreements (id, title, renteeid, propertyid, templateid, status, startdate, enddate, rentamount, depositamount, notes, createdat, updatedat, tenant_id)
				VALUES (@id, @title, @renteeid, @propertyid, @templateid, 'draft', @startdate, @enddate, @rentamount, @depositamount, @notes, @now, @now, @tenantId)`,
				{ id, title, renteeid, propertyid, templateid, startdate, enddate, rentamount, depositamount, notes, now, tenantId }
			);

			throw redirect(303, `/agreements/${id}`);
		} catch (err) {
			if (err.status === 303) throw err;
			console.error('[Agreements/New] Insert error:', err.message);
			return fail(500, { error: 'Failed to create agreement' });
		}
	}
};
