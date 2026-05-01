import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { assertCanSeeRentee } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const { id } = params;
	await assertCanSeeRentee(locals.user, id);

	const rentee = await runSingleQuery(
		`SELECT id, name, email, contact_details, status, active,
		        associated_property_ids, national_id, permanent_address,
		        notes, id_copy_url, invited, last_login, createdat, updatedat
		 FROM rentees
		 WHERE id = @id`,
		{ id }
	);
	if (!rentee) error(404, 'Rentee not found');

	const agreements = await runQuery(
		`SELECT a.id, a.title, a.status, a.startdate, a.enddate, a.rentamount,
		        p.name AS property_name
		 FROM agreements a
		 LEFT JOIN properties p ON p.id = a.propertyid
		 WHERE a.renteeid = @id
		 ORDER BY a.startdate DESC`,
		{ id }
	);

	const invoices = await runQuery(
		`SELECT i.id, i.billingperiod, i.totalamount, i.status, i.duedate,
		        p.name AS property_name
		 FROM invoices i
		 LEFT JOIN properties p ON p.id = i.propertyid
		 WHERE i.renteeid = @id
		 ORDER BY i.createdat DESC
		 LIMIT 20`,
		{ id }
	);

	return { rentee, agreements, invoices };
};
