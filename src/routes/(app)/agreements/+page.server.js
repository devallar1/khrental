import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const tenantId = locals.tenantId;

	let agreements = [];

	if (tenantId) {
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
					u.name AS rentee_name,
					u.email AS rentee_email,
					p.name AS property_name
				FROM agreements a
				LEFT JOIN app_users u ON u.id = a.renteeid
				LEFT JOIN properties p ON p.id = a.propertyid
				WHERE a.tenant_id = @tenantId
				ORDER BY a.createdat DESC`,
				{ tenantId }
			);
		} catch (err) {
			console.error('[Agreements] Query error:', err.message);
		}
	}

	return { agreements };
};
