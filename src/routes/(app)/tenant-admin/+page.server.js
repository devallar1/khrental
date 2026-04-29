import { runQuery } from '$api/db/query.js';
import { fail } from '@sveltejs/kit';
import crypto from 'crypto';

/** @type {import('./$types').PageServerLoad} */
export const load = async () => {
	let tenants = [];
	let memberships = [];

	try {
		tenants = await runQuery(
			`SELECT t.id, t.name, t.slug, t.status, t.plan, t.createdat,
			        COALESCE(mc.member_count, 0)::int AS member_count
			 FROM tenants t
			 LEFT JOIN (
			   SELECT tenantid, COUNT(*)::int AS member_count
			   FROM tenant_memberships
			   GROUP BY tenantid
			 ) mc ON mc.tenantid = t.id
			 ORDER BY t.createdat ASC`
		);

		memberships = await runQuery(
			`SELECT tm.id, tm.tenantid, tm.role, tm.createdat,
			        au.name AS user_name, au.email AS user_email
			 FROM tenant_memberships tm
			 LEFT JOIN app_users au ON au.id = tm.userid
			 ORDER BY tm.createdat DESC
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
				`INSERT INTO tenants (id, name, slug, status, plan, createdat, updatedat)
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
