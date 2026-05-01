import { runQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { templates: [] };

	let templates = [];
	try {
		templates = await runQuery(
			`SELECT id, name, language, version, createdat, updatedat
			FROM agreement_templates
			WHERE tenant_id = ANY(@orgs::uuid[])
			ORDER BY createdat DESC`,
			{ orgs }
		);
	} catch (err) {
		console.error('[Templates] Query error:', err.message);
	}

	return { templates };
};
