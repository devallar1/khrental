import { runSingleQuery } from '$api/db/query.js';
import { error, redirect, fail } from '@sveltejs/kit';
import { assertCanSeeRentee, assertCanManageRentee } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const { id } = params;
	await assertCanSeeRentee(locals.user, id);

	const rentee = await runSingleQuery(
		`SELECT id, name, email, contact_details, permanent_address, national_id, notes, active
		 FROM rentees
		 WHERE id = @id`,
		{ id }
	);
	if (!rentee) error(404, 'Rentee not found');

	let phone = '';
	if (rentee.contact_details) {
		const cd = typeof rentee.contact_details === 'string'
			? JSON.parse(rentee.contact_details)
			: rentee.contact_details;
		phone = cd?.phone || '';
	}

	return { rentee, phone };
};

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, params, locals }) => {
		const { id } = params;
		await assertCanManageRentee(locals.user, id);

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const phone = formData.get('phone')?.toString().trim();
		const permanent_address = formData.get('permanent_address')?.toString().trim();
		const national_id = formData.get('national_id')?.toString().trim();
		const notes = formData.get('notes')?.toString().trim();
		const active = formData.get('active') === 'on';

		if (!name) {
			return fail(400, { error: 'Name is required', name, email, phone, permanent_address, national_id, notes, active });
		}

		const contactDetails = phone ? JSON.stringify({ phone }) : null;

		try {
			await runSingleQuery(
				`UPDATE rentees
				 SET name = @name,
				     email = @email,
				     contact_details = @contactDetails,
				     permanent_address = @permanentAddress,
				     national_id = @nationalId,
				     notes = @notes,
				     active = @active,
				     updatedat = NOW()
				 WHERE id = @id`,
				{
					name: name || null,
					email: email || null,
					contactDetails,
					permanentAddress: permanent_address || null,
					nationalId: national_id || null,
					notes: notes || null,
					active,
					id
				}
			);

			redirect(303, `/rentees/${id}`);
		} catch (err) {
			if (err.status === 303) throw err;
			console.error('[Rentees] Update error:', err.message);
			return fail(500, { error: 'Failed to update rentee', name, email, phone, permanent_address, national_id, notes, active });
		}
	}
};
