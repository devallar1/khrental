import { runSingleQuery } from '$api/db/query.js';
import { redirect, fail } from '@sveltejs/kit';
import crypto from 'crypto';

/** @type {import('./$types').PageServerLoad} */
export const load = async () => {
	return {};
};

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, locals }) => {
		const tenantId = locals.tenantId;
		if (!tenantId) {
			return fail(400, { error: 'No tenant context' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() || '';
		const language = formData.get('language')?.toString().trim() || 'English';
		const version = formData.get('version')?.toString().trim() || '1.0';
		const content = formData.get('content')?.toString().trim() || '';

		if (!name) {
			return fail(400, { error: 'Template name is required', name, language, version, content });
		}

		try {
			const id = crypto.randomUUID();
			const now = new Date().toISOString();

			await runSingleQuery(
				`INSERT INTO agreement_templates (id, name, language, content, version, createdat, updatedat, tenant_id)
				VALUES (@id, @name, @language, @content, @version, @now, @now, @tenantId)`,
				{ id, name, language, content, version, now, tenantId }
			);

			throw redirect(303, '/agreements/templates');
		} catch (err) {
			if (err.status === 303) throw err;
			console.error('[Templates/New] Insert error:', err.message);
			return fail(500, { error: 'Failed to create template' });
		}
	}
};
