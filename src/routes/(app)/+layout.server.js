import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export const load = ({ locals, url }) => {
	if (!locals.user) {
		const target = `${url.pathname}${url.search}`;
		throw redirect(303, `/login?next=${encodeURIComponent(target)}`);
	}

	// Rentees never see the staff app shell — bounce them to their portal.
	if (locals.user.role === 'rentee') {
		throw redirect(303, '/portal');
	}

	return {
		user: locals.user,
		tenantId: locals.tenantId,
		tenant: locals.tenant
	};
};
