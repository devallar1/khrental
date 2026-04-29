import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const tenantId = locals.tenantId;
	const { id } = params;

	const rentee = await runSingleQuery(
		`SELECT id, name, email, contact_details, status, active,
		        associated_property_ids, national_id, permanent_address,
		        notes, id_copy_url, invited, last_login, createdat, updatedat
		 FROM app_users
		 WHERE id = @id AND user_type = 'rentee' AND tenant_id = @tenantId`,
		{ id, tenantId }
	);

	if (!rentee) {
		error(404, 'Rentee not found');
	}

	const agreements = await runQuery(
		`SELECT a.id, a.title, a.status, a.startdate, a.enddate, a.rentamount,
		        p.name AS property_name
		 FROM agreements a
		 LEFT JOIN properties p ON p.id = a.propertyid
		 WHERE a.renteeid = @id AND a.tenant_id = @tenantId
		 ORDER BY a.startdate DESC`,
		{ id, tenantId }
	);

	const invoices = await runQuery(
		`SELECT i.id, i.billingperiod, i.totalamount, i.status, i.duedate,
		        p.name AS property_name
		 FROM invoices i
		 LEFT JOIN properties p ON p.id = i.propertyid
		 WHERE i.renteeid = @id AND i.tenant_id = @tenantId
		 ORDER BY i.createdat DESC
		 LIMIT 20`,
		{ id, tenantId }
	);

	return { rentee, agreements, invoices };
};
