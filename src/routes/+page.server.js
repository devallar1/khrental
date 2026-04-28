import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = () => {
	redirect(302, '/dashboard');
};
