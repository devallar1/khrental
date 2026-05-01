import { runQuery } from '$api/db/query.js';
import { redirect, fail } from '@sveltejs/kit';
import crypto from 'crypto';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const role = formData.get('role')?.toString().trim();
		const notes = formData.get('notes')?.toString().trim() || null;

		if (!name || !email || !role) {
			return fail(400, { error: 'Name, email, and role are required', name, email, role, notes });
		}

		if (!['admin', 'staff', 'manager'].includes(role)) {
			return fail(400, { error: 'Invalid role', name, email, role, notes });
		}

		try {
			const id = crypto.randomUUID();
			await runQuery(
				`INSERT INTO app_users (id, name, email, role, user_type, status, active, createdat)
				 VALUES (@id, @name, @email, @role, @userType, 'active', true, NOW())`,
				{ id, name, email, role, userType: role }
			);
		} catch (err) {
			console.error('[Team] Create error:', err.message);
			return fail(500, { error: 'Failed to create team member', name, email, role, notes });
		}

		throw redirect(303, '/team');
	}
};
