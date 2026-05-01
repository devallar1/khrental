import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const requestId = params.id;
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) throw error(404, 'Maintenance request not found');

	let request = null;
	try {
		request = await runSingleQuery(
			`SELECT mr.id, mr.title, mr.description, mr.priority, mr.status,
			        mr.requesttype, mr.createdat, mr.notes,
			        mr.propertyid, mr.tenant_id, mr.assignedto,
			        p.name AS property_name, p.address AS property_address,
			        tenant.name AS tenant_name, tenant.email AS tenant_email,
			        assigned.name AS assigned_name, assigned.email AS assigned_email
			 FROM maintenance_requests mr
			 LEFT JOIN properties p ON p.id = mr.propertyid
			 LEFT JOIN tenants tenant ON tenant.id = mr.tenant_id
			 LEFT JOIN app_users assigned ON assigned.id = mr.assignedto
			 WHERE mr.id = @requestId AND p.owner_org_id = ANY(@orgs::uuid[])`,
			{ orgs, requestId }
		);
	} catch (err) {
		console.error('[Maintenance] Detail query error:', err.message);
		throw error(500, 'Failed to load maintenance request');
	}

	if (!request) throw error(404, 'Maintenance request not found');

	return { request };
};
