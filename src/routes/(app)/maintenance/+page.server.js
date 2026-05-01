import { runQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, url }) => {
	const orgs = await visibleOrgIds(locals.user);
	const statusFilter = url.searchParams.get('status') || 'all';

	if (orgs.length === 0) return { requests: [], statusFilter };

	let requests = [];
	try {
		let whereClause = 'WHERE p.owner_org_id = ANY(@orgs::uuid[])';
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
			 LEFT JOIN properties p ON p.id = mr.propertyid
			 LEFT JOIN rentees rentee ON rentee.id = mr.renteeid
			 LEFT JOIN app_users assigned ON assigned.id = mr.assignedto
			 ${whereClause}
			 ORDER BY mr.createdat DESC`,
			{ orgs, statusFilter }
		);
	} catch (err) {
		console.error('[Maintenance] List query error:', err.message);
	}

	return { requests, statusFilter };
};
