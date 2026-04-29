import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	return {
		user: locals.user,
		tenant: locals.tenant,
		tenants: locals.tenants
	};
};

/** @type {import('./$types').Actions} */
export const actions = {
	switchTenant: async ({ request, cookies }) => {
		const formData = await request.formData();
		const tenantId = formData.get('tenantId');

		if (tenantId) {
			cookies.set('kh_tenant_id', tenantId, {
				path: '/',
				httpOnly: false,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 365
			});
		}

		throw redirect(303, '/dashboard');
	}
};
