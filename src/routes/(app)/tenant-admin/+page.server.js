import { runQuery } from '$api/db/query.js';
import { fail } from '@sveltejs/kit';
import crypto from 'crypto';

/** @type {import('./$types').PageServerLoad} */
export const load = async () => {
	let tenants = [];
	let memberships = [];

	try {
		tenants = await runQuery(
			`SELECT o.id, o.name, o.slug, o.status, o.plan, o.createdat,
			        COALESCE(mc.member_count, 0)::int AS member_count
			 FROM organizations o
			 LEFT JOIN (
			   SELECT org_id, COUNT(*)::int AS member_count
			   FROM org_memberships
			   GROUP BY org_id
			 ) mc ON mc.org_id = o.id
			 ORDER BY o.createdat ASC`
		);

		memberships = await runQuery(
			`SELECT m.user_id || '::' || m.org_id AS id,
			        m.org_id AS tenantid, m.role, m.granted_at AS createdat,
			        au.name AS user_name, au.email AS user_email
			 FROM org_memberships m
			 LEFT JOIN app_users au ON au.id = m.user_id
			 ORDER BY m.granted_at DESC
			 LIMIT 100`
		);
	} catch (err) {
		console.error('[TenantAdmin] Query error:', err.message);
	}

	return { tenants, memberships };
};

/** @type {import('./$types').Actions} */
export const actions = {
	createTenant: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const slug = formData.get('slug')?.toString().trim();
		const plan = formData.get('plan')?.toString().trim() || 'free';

		if (!name || !slug) {
			return fail(400, { error: 'Name and slug are required', name, slug, plan });
		}

		// Validate slug format
		if (!/^[a-z0-9-]+$/.test(slug)) {
			return fail(400, { error: 'Slug must contain only lowercase letters, numbers, and hyphens', name, slug, plan });
		}

		try {
			const id = crypto.randomUUID();
			await runQuery(
				`INSERT INTO organizations (id, name, slug, status, plan, createdat, updatedat)
				 VALUES (@id, @name, @slug, 'active', @plan, NOW(), NOW())`,
				{ id, name, slug, plan }
			);
		} catch (err) {
			console.error('[TenantAdmin] Create error:', err.message);
			if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
				return fail(400, { error: 'A tenant with that slug already exists', name, slug, plan });
			}
			return fail(500, { error: 'Failed to create tenant', name, slug, plan });
		}

		return { success: true };
	}
};
