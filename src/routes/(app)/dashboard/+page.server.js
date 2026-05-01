import { runSingleQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	let stats = { properties: 0, rentees: 0, agreements: 0, invoices: 0 };

	if (orgs.length === 0) return { stats };

	try {
		const [properties, rentees, agreements, invoices] = await Promise.all([
			runSingleQuery('SELECT COUNT(*)::int AS count FROM properties WHERE tenant_id = ANY(@orgs::uuid[])', { orgs }),
			runSingleQuery('SELECT COUNT(*)::int AS count FROM rentees WHERE tenant_id = ANY(@orgs::uuid[])', { orgs }),
			runSingleQuery('SELECT COUNT(*)::int AS count FROM agreements WHERE tenant_id = ANY(@orgs::uuid[])', { orgs }),
			runSingleQuery('SELECT COUNT(*)::int AS count FROM invoices WHERE tenant_id = ANY(@orgs::uuid[])', { orgs })
		]);
		stats = {
			properties: properties?.count || 0,
			rentees: rentees?.count || 0,
			agreements: agreements?.count || 0,
			invoices: invoices?.count || 0
		};
	} catch (err) {
		console.error('[Dashboard] Stats query error:', err.message);
	}

	return { stats };
};
