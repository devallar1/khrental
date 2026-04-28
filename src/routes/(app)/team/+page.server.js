import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const tenantId = locals.tenantId;

	let members = [];

	if (tenantId) {
		try {
			members = await runQuery(
				`SELECT id, name, email, role, user_type, status, active, createdat
				 FROM app_users
				 WHERE tenant_id = @tenantId
				   AND user_type IN ('admin', 'staff', 'manager')
				 ORDER BY name ASC`,
				{ tenantId }
			);
		} catch (err) {
			console.error('[Team] List query error:', err.message);
		}
	}

	return { members };
};
