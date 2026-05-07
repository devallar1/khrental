import { runQuery } from '$api/db/query.js';
import { redirect, fail } from '@sveltejs/kit';
import crypto from 'crypto';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });

		// Pull the creator's primary org so we can place the new staff member
		// inside it via org_memberships.
		const creatorOrgId = locals.user.org_id || locals.orgId || null;

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
				`INSERT INTO app_users (id, name, email, role, user_type, org_id, status, active, createdat)
				 VALUES (@id, @name, @email, @role, @userType, @orgId, 'active', true, NOW())`,
				{ id, name, email, role, userType: role, orgId: creatorOrgId }
			);
			if (creatorOrgId) {
				await runQuery(
					`INSERT INTO org_memberships (user_id, org_id, role, granted_by)
					 VALUES (@id, @orgId, 'member', @grantedBy)
					 ON CONFLICT (user_id, org_id) DO NOTHING`,
					{ id, orgId: creatorOrgId, grantedBy: locals.user.id }
				);
			}
		} catch (err) {
			console.error('[Team] Create error:', err.message);
			return fail(500, { error: 'Failed to create team member', name, email, role, notes });
		}

		throw redirect(303, '/configure/team');
	}
};
