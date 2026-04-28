import { json } from '@sveltejs/kit';
import { getPgConfigStatus, isPgConfigured } from '$api/db/config.js';

/** @type {import('./$types').RequestHandler} */
export const GET = async () => {
	return json({
		ok: true,
		provider: 'postgresql',
		configured: isPgConfigured(),
		...getPgConfigStatus()
	});
};
