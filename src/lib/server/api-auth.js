// requireUser(event) — guard helper for /api/** endpoints.
//
// Returns the authenticated app_users row populated by hooks.server.js
// onto event.locals.user. Throws SvelteKit `error(401)` if missing.

import { error } from '@sveltejs/kit';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {NonNullable<App.Locals['user']>}
 */
export const requireUser = (event) => {
    const user = event.locals.user;
    if (!user) {
        throw error(401, 'Authentication required');
    }
    return user;
};

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string|string[]} allowedRoles
 * @returns {NonNullable<App.Locals['user']>}
 */
export const requireRole = (event, allowedRoles) => {
    const user = requireUser(event);
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!user.role || !allowed.includes(user.role)) {
        throw error(403, 'Insufficient permissions');
    }
    return user;
};
