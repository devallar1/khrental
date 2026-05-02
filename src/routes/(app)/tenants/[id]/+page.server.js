import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { assertCanSeeTenant } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const { id } = params;
	await assertCanSeeTenant(locals.user, id);

	const tenant = await runSingleQuery(
		`SELECT id, name, email, contact_details, status, active,
		        associated_property_ids, national_id, permanent_address,
		        notes, id_copy_url, invited, last_login, createdat, updatedat
		 FROM tenants
		 WHERE id = @id`,
		{ id }
	);
	if (!tenant) error(404, 'Tenant not found');

	const agreements = await runQuery(
		`SELECT a.id, a.title, a.status, a.startdate, a.enddate, a.rentamount, a.currency,
		        p.name AS property_name
		 FROM agreements a
		 LEFT JOIN properties p ON p.id = a.propertyid
		 WHERE a.tenant_id = @id
		 ORDER BY a.startdate DESC`,
		{ id }
	);

	const invoices = await runQuery(
		`SELECT i.id, i.billingperiod, i.totalamount, i.status, i.duedate, i.currency,
		        p.name AS property_name
		 FROM invoices i
		 LEFT JOIN properties p ON p.id = i.propertyid
		 WHERE i.tenant_id = @id
		 ORDER BY i.createdat DESC
		 LIMIT 20`,
		{ id }
	);

	return { tenant, agreements, invoices };
};
