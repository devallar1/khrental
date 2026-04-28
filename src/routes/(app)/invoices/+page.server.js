import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const tenantId = locals.tenantId;

	let invoices = [];

	if (tenantId) {
		try {
			invoices = await runQuery(
				`SELECT i.id, i.billingperiod, i.totalamount, i.status, i.duedate,
				        i.paymentdate, i.createdat,
				        u.name AS rentee_name, u.email AS rentee_email,
				        p.name AS property_name
				 FROM invoices i
				 LEFT JOIN app_users u ON u.id = i.renteeid AND u.tenant_id = @tenantId
				 LEFT JOIN properties p ON p.id = i.propertyid AND p.tenant_id = @tenantId
				 WHERE i.tenant_id = @tenantId
				 ORDER BY i.createdat DESC`,
				{ tenantId }
			);
		} catch (err) {
			console.error('[Invoices] List query error:', err.message);
		}
	}

	return { invoices };
};
