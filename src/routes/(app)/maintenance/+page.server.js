import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, url }) => {
	const tenantId = locals.tenantId;
	const statusFilter = url.searchParams.get('status') || 'all';

	let requests = [];

	if (tenantId) {
		try {
			let whereClause = 'WHERE mr.tenant_id = @tenantId';
			if (statusFilter && statusFilter !== 'all') {
				whereClause += ' AND mr.status = @statusFilter';
			}

			requests = await runQuery(
				`SELECT mr.id, mr.title, mr.description, mr.priority, mr.status,
				        mr.requesttype, mr.createdat, mr.notes,
				        p.name AS property_name,
				        rentee.name AS rentee_name,
				        assigned.name AS assigned_name
				 FROM maintenance_requests mr
				 LEFT JOIN properties p ON p.id = mr.propertyid AND p.tenant_id = @tenantId
				 LEFT JOIN app_users rentee ON rentee.id = mr.renteeid
				 LEFT JOIN app_users assigned ON assigned.id = mr.assignedto
				 ${whereClause}
				 ORDER BY mr.createdat DESC`,
				{ tenantId, statusFilter }
			);
		} catch (err) {
			console.error('[Maintenance] List query error:', err.message);
		}
	}

	return { requests, statusFilter };
};
