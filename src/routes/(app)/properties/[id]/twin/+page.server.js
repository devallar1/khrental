import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { assertCanSeeProperty } from '$lib/server/authz.js';

export const load = async ({ params, locals }) => {
	const propertyId = params.id;
	await assertCanSeeProperty(locals.user, propertyId);

	const property = await runSingleQuery(
		`SELECT id, name, latitude, longitude, boundary_geojson
		 FROM properties WHERE id = @propertyId`,
		{ propertyId }
	);
	if (!property) error(404, 'Property not found');
	return { property };
};
