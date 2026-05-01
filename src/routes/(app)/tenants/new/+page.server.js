import { runSingleQuery } from '$api/db/query.js';
import { redirect, fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const orgId = locals.orgId;
		if (!orgId) {
			return fail(403, { error: 'No org context' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const phone = formData.get('phone')?.toString().trim();
		const permanent_address = formData.get('permanent_address')?.toString().trim();
		const national_id = formData.get('national_id')?.toString().trim();
		const notes = formData.get('notes')?.toString().trim();

		if (!name) {
			return fail(400, { error: 'Name is required', name, email, phone, permanent_address, national_id, notes });
		}

		const contactDetails = phone ? JSON.stringify({ phone }) : null;

		try {
			const result = await runSingleQuery(
				`INSERT INTO tenants (name, email, contact_details, permanent_address, national_id, notes, org_id, active)
				 VALUES (@name, @email, @contactDetails, @permanentAddress, @nationalId, @notes, @orgId, true)
				 RETURNING id`,
				{
					name: name || null,
					email: email || null,
					contactDetails,
					permanentAddress: permanent_address || null,
					nationalId: national_id || null,
					notes: notes || null,
					orgId
				}
			);

			redirect(303, `/tenants/${result.id}`);
		} catch (err) {
			if (err.status === 303) throw err;
			console.error('[Tenants] Create error:', err.message);
			return fail(500, { error: 'Failed to create tenant', name, email, phone, permanent_address, national_id, notes });
		}
	}
};
