import { runSingleQuery, runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const tenantId = locals.tenantId;

	let stats = { properties: 0, rentees: 0, agreements: 0, invoices: 0 };

	if (tenantId) {
		try {
			const [properties, rentees, agreements, invoices] = await Promise.all([
				runSingleQuery('SELECT COUNT(*)::int AS count FROM properties WHERE tenant_id = @tenantId', { tenantId }),
				runSingleQuery('SELECT COUNT(*)::int AS count FROM app_users WHERE tenant_id = @tenantId', { tenantId }),
				runSingleQuery('SELECT COUNT(*)::int AS count FROM agreements WHERE tenant_id = @tenantId', { tenantId }),
				runSingleQuery('SELECT COUNT(*)::int AS count FROM invoices WHERE tenant_id = @tenantId', { tenantId })
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
	}

	return { stats };
};
