import { runQuery } from '$api/db/query.js';
import { error, fail } from '@sveltejs/kit';
import crypto from 'node:crypto';

export const load = async ({ locals }) => {
	if (!locals.user?.id) error(401, 'Not authenticated');

	const profiles = await runQuery(
		`SELECT bp.id, bp.tenant_id, bp.label, bp.account_holder_name, bp.account_number,
		        bp.bank_name, bp.branch, bp.notes, bp.active,
		        t.name AS tenant_name, t.slug AS tenant_slug
		   FROM bank_profiles bp
		   JOIN tenants t ON t.id = bp.tenant_id
		  WHERE t.status = 'active'
		  ORDER BY bp.active DESC, t.name, bp.label`
	);
	const tenants = await runQuery(
		`SELECT id, name, slug FROM tenants WHERE status = 'active' ORDER BY name`
	);
	return { profiles, tenants };
};

const fieldStr = (fd, k) => String(fd.get(k) || '').trim();
const fieldOpt = (fd, k) => fieldStr(fd, k) || null;

export const actions = {
	create: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		const fd = await request.formData();
		const tenant_id = fieldStr(fd, 'tenant_id');
		const label = fieldStr(fd, 'label');
		const account_holder_name = fieldStr(fd, 'account_holder_name');
		const account_number = fieldStr(fd, 'account_number');
		const bank_name = fieldStr(fd, 'bank_name');
		const branch = fieldOpt(fd, 'branch');
		const notes = fieldOpt(fd, 'notes');

		if (!tenant_id || !label || !account_holder_name || !account_number || !bank_name) {
			return fail(400, { action: 'create', error: 'Missing required fields' });
		}

		const id = crypto.randomUUID();
		try {
			await runQuery(
				`INSERT INTO bank_profiles
				   (id, tenant_id, label, account_holder_name, account_number,
				    bank_name, branch, notes, active, createdat, updatedat)
				 VALUES
				   (@id, @tenant_id, @label, @account_holder_name, @account_number,
				    @bank_name, @branch, @notes, TRUE, NOW(), NOW())`,
				{ id, tenant_id, label, account_holder_name, account_number, bank_name, branch, notes }
			);
		} catch (err) {
			if (err?.code === '23505') {
				return fail(400, { action: 'create', error: 'An account with that number already exists for this org' });
			}
			console.error('[bank-profiles create]', err);
			return fail(500, { action: 'create', error: 'Failed to create profile' });
		}
		return { ok: true, action: 'create', id };
	},

	update: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		const fd = await request.formData();
		const id = fieldStr(fd, 'id');
		if (!id) return fail(400, { action: 'update', error: 'Missing id' });

		const label = fieldStr(fd, 'label');
		const account_holder_name = fieldStr(fd, 'account_holder_name');
		const account_number = fieldStr(fd, 'account_number');
		const bank_name = fieldStr(fd, 'bank_name');
		const branch = fieldOpt(fd, 'branch');
		const notes = fieldOpt(fd, 'notes');

		if (!label || !account_holder_name || !account_number || !bank_name) {
			return fail(400, { action: 'update', error: 'Missing required fields' });
		}

		try {
			await runQuery(
				`UPDATE bank_profiles
				    SET label = @label,
				        account_holder_name = @account_holder_name,
				        account_number = @account_number,
				        bank_name = @bank_name,
				        branch = @branch,
				        notes = @notes,
				        updatedat = NOW()
				  WHERE id = @id`,
				{ id, label, account_holder_name, account_number, bank_name, branch, notes }
			);
		} catch (err) {
			if (err?.code === '23505') {
				return fail(400, { action: 'update', error: 'That account number is already used by another profile in this org' });
			}
			console.error('[bank-profiles update]', err);
			return fail(500, { action: 'update', error: 'Failed to update profile' });
		}
		return { ok: true, action: 'update', id };
	},

	archive: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		const fd = await request.formData();
		const id = fieldStr(fd, 'id');
		if (!id) return fail(400, { action: 'archive', error: 'Missing id' });
		await runQuery(
			`UPDATE bank_profiles SET active = FALSE, updatedat = NOW() WHERE id = @id`,
			{ id }
		);
		return { ok: true, action: 'archive', id };
	},

	restore: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		const fd = await request.formData();
		const id = fieldStr(fd, 'id');
		if (!id) return fail(400, { action: 'restore', error: 'Missing id' });
		await runQuery(
			`UPDATE bank_profiles SET active = TRUE, updatedat = NOW() WHERE id = @id`,
			{ id }
		);
		return { ok: true, action: 'restore', id };
	}
};
