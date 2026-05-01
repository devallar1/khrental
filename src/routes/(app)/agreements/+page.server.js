import { runQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { agreements: [] };

	let agreements = [];
	try {
		agreements = await runQuery(
			`SELECT
				a.id,
				a.title,
				a.status,
				a.startdate,
				a.enddate,
				a.rentamount,
				a.depositamount,
				a.createdat,
				u.name AS tenant_name,
				u.email AS tenant_email,
				p.name AS property_name
			FROM agreements a
			LEFT JOIN tenants u ON u.id = a.tenant_id
			LEFT JOIN properties p ON p.id = a.propertyid
			WHERE p.owner_org_id = ANY(@orgs::uuid[])
			ORDER BY a.createdat DESC`,
			{ orgs }
		);
	} catch (err) {
		console.error('[Agreements] Query error:', err.message);
	}

	return { agreements };
};
