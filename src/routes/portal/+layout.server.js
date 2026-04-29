import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export const load = ({ locals, url }) => {
	if (!locals.user) {
		const target = `${url.pathname}${url.search}`;
		throw redirect(303, `/login?next=${encodeURIComponent(target)}`);
	}

	// Staff never land in /portal — send them to the staff dashboard.
	if (locals.user.role !== 'rentee') {
		throw redirect(303, '/dashboard');
	}

	return {
		user: locals.user,
		tenant: locals.tenant
	};
};
