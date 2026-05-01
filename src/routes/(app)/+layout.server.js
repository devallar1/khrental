import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export const load = ({ locals, url }) => {
	if (!locals.user) {
		const target = `${url.pathname}${url.search}`;
		throw redirect(303, `/login?next=${encodeURIComponent(target)}`);
	}

	// Tenants (renters) never see the staff app shell — bounce them
	// to their portal.
	if (locals.user.kind === 'tenant') {
		throw redirect(303, '/portal');
	}

	return {
		user: locals.user,
		orgId: locals.orgId,
		org: locals.org
	};
};
