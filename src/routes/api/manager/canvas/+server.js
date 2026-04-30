import { json, error } from '@sveltejs/kit';
import { runSingleQuery } from '$api/db/query.js';

const formatTimestamp = (ts) => {
	if (!ts) return null;
	if (ts instanceof Date) return ts.toISOString();
	try { return new Date(ts).toISOString(); } catch { return null; }
};

// Shared canvas — all signed-in managers read/write the same row. Keyed on a
// fixed scope; per-user rows can be added later by passing user-specific scopes.
const SHARED_SCOPE = 'shared';

export const GET = async ({ locals }) => {
	if (!locals.user?.id) error(401, 'Not authenticated');

	const row = await runSingleQuery(
		`SELECT state, updated_at FROM manager_canvas_states WHERE scope = @scope`,
		{ scope: SHARED_SCOPE }
	);
	return json({
		state: row?.state ?? {},
		updatedAt: formatTimestamp(row?.updated_at)
	});
};

export const POST = async ({ request, locals }) => {
	if (!locals.user?.id) error(401, 'Not authenticated');

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}
	const state = body?.state ?? {};

	const row = await runSingleQuery(
		`INSERT INTO manager_canvas_states (scope, state, updated_at)
		 VALUES (@scope, @state::jsonb, NOW())
		 ON CONFLICT (scope) DO UPDATE
		   SET state = EXCLUDED.state, updated_at = NOW()
		 RETURNING updated_at`,
		{ scope: SHARED_SCOPE, state: JSON.stringify(state) }
	);
	return json({ ok: true, updatedAt: formatTimestamp(row?.updated_at) });
};
