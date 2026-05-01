import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { assertCanSeeProperty } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const propertyId = params.id;

	// 403 if the user can't see this property; 404 if it doesn't exist.
	// Order matters — we check authz first so a probe of a real-but-
	// unauthorized id can't be distinguished from a real-and-authorized
	// one via timing.
	await assertCanSeeProperty(locals.user, propertyId);

	const property = await runSingleQuery(
		`SELECT * FROM properties WHERE id = @propertyId`,
		{ propertyId }
	);
	if (!property) error(404, 'Property not found');

	const [units, agreements] = await Promise.all([
		runQuery(
			`SELECT * FROM property_units
			 WHERE propertyid = @propertyId
			 ORDER BY unitnumber ASC`,
			{ propertyId }
		),
		runQuery(
			`SELECT a.id, a.title, a.status, a.startdate, a.enddate, a.rentamount,
			        a.unitid, u.name AS rentee_name, u.email AS rentee_email,
			        pu.unitnumber
			 FROM agreements a
			 LEFT JOIN tenants u ON u.id = a.tenant_id
			 LEFT JOIN property_units pu ON pu.id = a.unitid
			 WHERE a.propertyid = @propertyId
			 ORDER BY a.startdate DESC`,
			{ propertyId }
		)
	]);

	return { property, units, agreements };
};
