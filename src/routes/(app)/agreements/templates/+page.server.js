import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const tenantId = locals.tenantId;

	let templates = [];

	if (tenantId) {
		try {
			templates = await runQuery(
				`SELECT id, name, language, version, createdat, updatedat
				FROM agreement_templates
				WHERE tenant_id = @tenantId
				ORDER BY createdat DESC`,
				{ tenantId }
			);
		} catch (err) {
			console.error('[Templates] Query error:', err.message);
		}
	}

	return { templates };
};
