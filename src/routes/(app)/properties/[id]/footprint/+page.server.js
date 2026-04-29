import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error, fail, redirect } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
	const tenantId = locals.tenantId;
	const propertyId = params.id;

	const property = await runSingleQuery(
		`SELECT id, name, latitude, longitude, boundary_geojson
		 FROM properties WHERE id = @propertyId AND tenant_id = @tenantId`,
		{ propertyId, tenantId }
	);

	if (!property) error(404, 'Property not found');

	// Units to assign to unit-kind polygons
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
		const tenantId = locals.tenantId;
		const propertyId = params.id;
		if (!tenantId) return fail(401, { error: 'No tenant context' });

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
				 WHERE id = @propertyId AND tenant_id = @tenantId`,
				{
					geojson: geojson ? JSON.stringify(geojson) : null,
					propertyId,
					tenantId
				}
			);
		} catch (err) {
			console.error('[Footprint] Save error:', err.message);
			return fail(500, { error: 'Failed to save footprints' });
		}

		redirect(303, `/properties/${propertyId}`);
	}
};
