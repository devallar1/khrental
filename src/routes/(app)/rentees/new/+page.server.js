import { runSingleQuery } from '$api/db/query.js';
import { redirect, fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const tenantId = locals.tenantId;
		if (!tenantId) {
			return fail(403, { error: 'No tenant context' });
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
				`INSERT INTO rentees (name, email, contact_details, permanent_address, national_id, notes, tenant_id, active)
				 VALUES (@name, @email, @contactDetails, @permanentAddress, @nationalId, @notes, @tenantId, true)
				 RETURNING id`,
				{
					name: name || null,
					email: email || null,
					contactDetails,
					permanentAddress: permanent_address || null,
					nationalId: national_id || null,
					notes: notes || null,
					tenantId
				}
			);

			redirect(303, `/rentees/${result.id}`);
		} catch (err) {
			if (err.status === 303) throw err;
			console.error('[Rentees] Create error:', err.message);
			return fail(500, { error: 'Failed to create rentee', name, email, phone, permanent_address, national_id, notes });
		}
	}
};
