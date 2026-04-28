import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals, params }) => {
	const tenantId = locals.tenantId;
	const { id } = params;

	const agreement = await runSingleQuery(
		`SELECT
			a.*,
			u.name AS rentee_name,
			u.email AS rentee_email,
			u.contact_details->>'phone' AS rentee_phone,
			p.name AS property_name,
			p.address AS property_address,
			p.city AS property_city,
			pu.unitnumber AS unit_number,
			t.name AS template_name,
			t.language AS template_language,
			t.version AS template_version
		FROM agreements a
		LEFT JOIN app_users u ON u.id = a.renteeid
		LEFT JOIN properties p ON p.id = a.propertyid
		LEFT JOIN property_units pu ON pu.id = a.unitid
		LEFT JOIN agreement_templates t ON t.id = a.templateid
		WHERE a.id = @id AND a.tenant_id = @tenantId`,
		{ id, tenantId }
	);

	if (!agreement) {
		throw error(404, 'Agreement not found');
	}

	return { agreement };
};
