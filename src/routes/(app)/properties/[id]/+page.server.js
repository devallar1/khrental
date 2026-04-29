import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const tenantId = locals.tenantId;
	const propertyId = params.id;

	const property = await runSingleQuery(
		`SELECT * FROM properties WHERE id = @propertyId AND tenant_id = @tenantId`,
		{ propertyId, tenantId }
	);

	if (!property) {
		error(404, 'Property not found');
	}

	const [units, agreements] = await Promise.all([
		runQuery(
			`SELECT * FROM property_units
			 WHERE propertyid = @propertyId AND tenant_id = @tenantId
			 ORDER BY unitnumber ASC`,
			{ propertyId, tenantId }
		),
		runQuery(
			`SELECT a.id, a.title, a.status, a.startdate, a.enddate, a.rentamount,
			        a.unitid, u.name AS rentee_name, u.email AS rentee_email,
			        pu.unitnumber
			 FROM agreements a
			 LEFT JOIN app_users u ON u.id = a.renteeid
			 LEFT JOIN property_units pu ON pu.id = a.unitid
			 WHERE a.propertyid = @propertyId AND a.tenant_id = @tenantId
			 ORDER BY a.startdate DESC`,
			{ propertyId, tenantId }
		)
	]);

	return { property, units, agreements };
};
