import { runQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { rentees: [], propertiesMap: {} };

	let rentees = [];
	try {
		rentees = await runQuery(
			`SELECT id, name, email, contact_details, status, active,
			        associated_property_ids, national_id, permanent_address,
			        createdat
			 FROM app_users
			 WHERE user_type = 'rentee' AND tenant_id = ANY(@orgs::uuid[])
			 ORDER BY name ASC`,
			{ orgs }
		);
	} catch (err) {
		console.error('[Rentees] List query error:', err.message);
	}

	let propertiesMap = {};
	try {
		const properties = await runQuery(
			`SELECT id, name FROM properties WHERE tenant_id = ANY(@orgs::uuid[])`,
			{ orgs }
		);
		for (const p of properties) {
			propertiesMap[p.id] = p.name;
		}
	} catch (err) {
		console.error('[Rentees] Properties query error:', err.message);
	}

	return { rentees, propertiesMap };
};
