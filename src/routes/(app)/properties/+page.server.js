import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const tenantId = locals.tenantId;

	let properties = [];

	if (tenantId) {
		try {
			properties = await runQuery(
				`SELECT p.id, p.name, p.address, p.status, p.propertytype, p.squarefeet,
				        p.createdat, p.description,
				        COALESCE(pu.unit_count, 0)::int AS unit_count
				 FROM properties p
				 LEFT JOIN (
				   SELECT propertyid, COUNT(*)::int AS unit_count
				   FROM property_units
				   WHERE tenant_id = @tenantId
				   GROUP BY propertyid
				 ) pu ON pu.propertyid = p.id
				 WHERE p.tenant_id = @tenantId
				 ORDER BY p.createdat DESC`,
				{ tenantId }
			);
		} catch (err) {
			console.error('[Properties] List query error:', err.message);
		}
	}

	return { properties };
};
