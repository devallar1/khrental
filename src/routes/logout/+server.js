import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';

/** @type {import('./$types').RequestHandler} */
export const POST = async ({ request }) => {
	try {
		await auth.api.signOut({ headers: request.headers });
	} catch (error) {
		console.error('[logout] signOut failed:', error);
	}
	throw redirect(303, '/login');
};

export const GET = POST;
