import { runQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const userId = locals.user.id;
	const tenantId = locals.tenantId;

	const invoices = await runQuery(
		`SELECT i.id,
		        i.billingperiod,
		        i.totalamount,
		        i.status,
		        i.duedate,
		        i.paymentdate,
		        i.paymentproofurl,
		        i.notes,
		        i.createdat,
		        p.name AS property_name,
		        p.address AS property_address
		   FROM invoices i
		   LEFT JOIN properties p ON p.id = i.propertyid
		  WHERE i.renteeid = @userId
		  ORDER BY COALESCE(i.duedate, i.createdat) DESC`,
		{ userId, tenantId }
	);

	return { invoices };
};
