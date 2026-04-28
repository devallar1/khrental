import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const tenantId = locals.tenantId;

	let rentees = [];

	if (tenantId) {
		try {
			rentees = await runQuery(
				`SELECT id, name, email, contact_details, status, active,
				        associated_property_ids, national_id, permanent_address,
				        createdat
				 FROM app_users
				 WHERE user_type = 'rentee' AND tenant_id = @tenantId
				 ORDER BY name ASC`,
				{ tenantId }
			);
		} catch (err) {
			console.error('[Rentees] List query error:', err.message);
		}
	}

	// Fetch property names for display
	let propertiesMap = {};
	if (tenantId) {
		try {
			const properties = await runQuery(
				`SELECT id, name FROM properties WHERE tenant_id = @tenantId`,
				{ tenantId }
			);
			for (const p of properties) {
				propertiesMap[p.id] = p.name;
			}
		} catch (err) {
			console.error('[Rentees] Properties query error:', err.message);
		}
	}

	return { rentees, propertiesMap };
};
