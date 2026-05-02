import { runQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { invoices: [] };

	let invoices = [];
	try {
		invoices = await runQuery(
			`SELECT i.id, i.billingperiod, i.totalamount, i.status, i.duedate,
			        i.paymentdate, i.createdat, i.currency,
			        u.name AS tenant_name, u.email AS tenant_email,
			        p.name AS property_name
			 FROM invoices i
			 LEFT JOIN tenants u ON u.id = i.tenant_id
			 LEFT JOIN properties p ON p.id = i.propertyid
			 WHERE p.owner_org_id = ANY(@orgs::uuid[])
			 ORDER BY i.createdat DESC`,
			{ orgs }
		);
	} catch (err) {
		console.error('[Invoices] List query error:', err.message);
	}

	return { invoices };
};
