import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
	const tenantId = locals.tenantId;
	const propertyId = params.id;

	const property = await runSingleQuery(
		`SELECT id, name, latitude, longitude, boundary_geojson
		 FROM properties WHERE id = @propertyId AND tenant_id = @tenantId`,
		{ propertyId, tenantId }
	);

	if (!property) error(404, 'Property not found');
	return { property };
};
