import { runQuery } from '$api/db/query.js';
import { visiblePropertyIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const ids = await visiblePropertyIds(locals.user);
	if (ids.length === 0) return { properties: [] };

	let properties = [];
	try {
		properties = await runQuery(
			`SELECT p.id, p.name, p.address, p.status, p.propertytype, p.squarefeet,
			        p.createdat, p.description,
			        COALESCE(pu.unit_count, 0)::int AS unit_count
			 FROM properties p
			 LEFT JOIN (
			   SELECT propertyid, COUNT(*)::int AS unit_count
			   FROM property_units
			   WHERE propertyid = ANY(@ids::uuid[])
			   GROUP BY propertyid
			 ) pu ON pu.propertyid = p.id
			 WHERE p.id = ANY(@ids::uuid[])
			 ORDER BY p.createdat DESC`,
			{ ids }
		);
	} catch (err) {
		console.error('[Properties] List query error:', err.message);
	}

	return { properties };
};
