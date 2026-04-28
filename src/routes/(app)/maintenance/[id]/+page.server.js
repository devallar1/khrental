import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const tenantId = locals.tenantId;
	const requestId = params.id;

	if (!tenantId) throw error(400, 'No tenant selected');

	let request = null;

	try {
		request = await runSingleQuery(
			`SELECT mr.id, mr.title, mr.description, mr.priority, mr.status,
			        mr.requesttype, mr.createdat, mr.notes,
			        mr.propertyid, mr.renteeid, mr.assignedto,
			        p.name AS property_name, p.address AS property_address,
			        rentee.name AS rentee_name, rentee.email AS rentee_email,
			        assigned.name AS assigned_name, assigned.email AS assigned_email
			 FROM maintenance_requests mr
			 LEFT JOIN properties p ON p.id = mr.propertyid AND p.tenant_id = @tenantId
			 LEFT JOIN app_users rentee ON rentee.id = mr.renteeid
			 LEFT JOIN app_users assigned ON assigned.id = mr.assignedto
			 WHERE mr.id = @requestId AND mr.tenant_id = @tenantId`,
			{ tenantId, requestId }
		);
	} catch (err) {
		console.error('[Maintenance] Detail query error:', err.message);
		throw error(500, 'Failed to load maintenance request');
	}

	if (!request) throw error(404, 'Maintenance request not found');

	return { request };
};
