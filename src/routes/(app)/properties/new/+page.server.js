import { runSingleQuery } from '$api/db/query.js';
import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const tenantId = locals.tenantId;
		if (!tenantId) return fail(401, { error: 'No tenant context' });

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
			const result = await runSingleQuery(
				`INSERT INTO properties (name, address, propertytype, status, description, squarefeet, yearbuilt, amenities, electricity_rate, water_rate, tenant_id, createdat, updatedat)
				 VALUES (@name, @address, @propertytype, @status, @description, @squarefeet, @yearbuilt, @amenities, @electricity_rate, @water_rate, @tenantId, NOW(), NOW())
				 RETURNING id`,
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
					tenantId
				}
			);

			redirect(303, `/properties/${result.id}`);
		} catch (err) {
			if (err.status === 303) throw err;
			console.error('[Properties] Create error:', err.message);
			return fail(500, { error: 'Failed to create property', values: Object.fromEntries(formData) });
		}
	}
};
