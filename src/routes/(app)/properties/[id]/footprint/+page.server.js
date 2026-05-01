import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error, fail, redirect } from '@sveltejs/kit';
import { assertCanSeeProperty, assertCanManageProperty } from '$lib/server/authz.js';

export const load = async ({ params, locals }) => {
	const propertyId = params.id;
	await assertCanSeeProperty(locals.user, propertyId);

	const property = await runSingleQuery(
		`SELECT id, name, latitude, longitude, boundary_geojson
		 FROM properties WHERE id = @propertyId`,
		{ propertyId }
	);
	if (!property) error(404, 'Property not found');

	const units = await runQuery(
		`SELECT id, unitnumber, status
		 FROM property_units WHERE propertyid = @propertyId
		 ORDER BY unitnumber`,
		{ propertyId }
	);

	return { property, units };
};

export const actions = {
	default: async ({ request, params, locals }) => {
		const propertyId = params.id;
		await assertCanManageProperty(locals.user, propertyId);

		const formData = await request.formData();
		const raw = formData.get('boundary_geojson')?.toString() || '';

		let geojson = null;
		if (raw) {
			try {
				const parsed = JSON.parse(raw);
				if (parsed?.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
					geojson = parsed;
				} else {
					return fail(400, { error: 'Expected a GeoJSON FeatureCollection' });
				}
			} catch {
				return fail(400, { error: 'Invalid GeoJSON' });
			}
		}

		try {
			await runSingleQuery(
				`UPDATE properties
				 SET boundary_geojson = @geojson, updatedat = NOW()
				 WHERE id = @propertyId`,
				{
					geojson: geojson ? JSON.stringify(geojson) : null,
					propertyId
				}
			);
		} catch (err) {
			console.error('[Footprint] Save error:', err.message);
			return fail(500, { error: 'Failed to save footprints' });
		}

		redirect(303, `/properties/${propertyId}`);
	}
};
