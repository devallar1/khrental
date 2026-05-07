import { redirect } from '@sveltejs/kit';

/**
 * Root landing — role-based.
 * - Unauth visitors go to /login.
 * - Staff (admin/manager/owner) land on /manager (the workshop) — the
 *   operational surface they use daily. /dashboard is the cockpit they
 *   visit when they want to step back and check financial health, triage,
 *   and activity.
 * - Tenants land on /portal (their cockpit — the only surface they have).
 *
 * @type {import('./$types').PageServerLoad}
 */
export const load = ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}
	if (locals.user.kind === 'tenant') {
		redirect(303, '/portal');
	}
	redirect(303, '/manager');
};
