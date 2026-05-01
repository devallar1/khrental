import { runQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { members: [] };

	let members = [];
	try {
		members = await runQuery(
			`SELECT id, name, email, role, user_type, status, active, createdat
			 FROM app_users
			 WHERE org_id = ANY(@orgs::uuid[])
			   AND user_type IN ('admin', 'staff', 'manager')
			 ORDER BY name ASC`,
			{ orgs }
		);
	} catch (err) {
		console.error('[Team] List query error:', err.message);
	}

	return { members };
};
