import { runSingleQuery } from '$api/db/query.js';
import { error, fail, redirect } from '@sveltejs/kit';
import { assertCanSeeProperty, assertCanManageProperty } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const propertyId = params.id;
	await assertCanSeeProperty(locals.user, propertyId);

	const property = await runSingleQuery(
		`SELECT * FROM properties WHERE id = @propertyId`,
		{ propertyId }
	);
	if (!property) error(404, 'Property not found');

	return { property };
};

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, params, locals }) => {
		const propertyId = params.id;
		await assertCanManageProperty(locals.user, propertyId);

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const address = formData.get('address')?.toString().trim() || null;
		const propertytype = formData.get('propertytype')?.toString().trim() || null;
		const status = formData.get('status')?.toString().trim() || 'available';
		const description = formData.get('description')?.toString().trim() || null;
		const squarefeet = formData.get('squarefeet')?.toString().trim() || null;
		const yearbuilt = formData.get('yearbuilt')?.toString().trim() || null;
		const amenitiesRaw = formData.get('amenities')?.toString().trim() || '';
		const electricity_rate = formData.get('electricity_rate')?.toString().trim() || null;
		const water_rate = formData.get('water_rate')?.toString().trim() || null;

		if (!name) {
			return fail(400, { error: 'Property name is required', values: Object.fromEntries(formData) });
		}

		const amenities = amenitiesRaw
			? amenitiesRaw.split(',').map((a) => a.trim()).filter(Boolean)
			: [];

		try {
			await runSingleQuery(
				`UPDATE properties
				 SET name = @name,
				     address = @address,
				     propertytype = @propertytype,
				     status = @status,
				     description = @description,
				     squarefeet = @squarefeet,
				     yearbuilt = @yearbuilt,
				     amenities = @amenities,
				     electricity_rate = @electricity_rate,
				     water_rate = @water_rate,
				     updatedat = NOW()
				 WHERE id = @propertyId`,
				{
					name,
					address,
					propertytype,
					status,
					description,
					squarefeet: squarefeet ? parseFloat(squarefeet) : null,
					yearbuilt: yearbuilt ? parseInt(yearbuilt, 10) : null,
					amenities,
					electricity_rate: electricity_rate ? parseFloat(electricity_rate) : null,
					water_rate: water_rate ? parseFloat(water_rate) : null,
					propertyId
				}
			);

			redirect(303, `/properties/${propertyId}`);
		} catch (err) {
			if (err.status === 303) throw err;
			console.error('[Properties] Update error:', err.message);
			return fail(500, { error: 'Failed to update property', values: Object.fromEntries(formData) });
		}
	}
};
