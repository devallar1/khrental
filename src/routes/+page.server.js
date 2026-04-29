import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}
	const target = locals.user.role === 'rentee' ? '/portal' : '/dashboard';
	redirect(302, target);
};
