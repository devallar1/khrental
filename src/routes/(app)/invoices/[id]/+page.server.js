import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { isErpNextConfigured } from '$lib/server/erpnext.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const tenantId = locals.tenantId;
	const invoiceId = params.id;

	if (!tenantId) {
		throw error(403, 'No tenant context');
	}

	let invoice = null;

	try {
		invoice = await runSingleQuery(
			`SELECT i.*,
			        u.name AS rentee_name, u.email AS rentee_email, u.contact_details->>'phone' AS rentee_phone,
			        p.name AS property_name, p.address AS property_address
			 FROM invoices i
			 LEFT JOIN app_users u ON u.id = i.renteeid AND u.tenant_id = @tenantId
			 LEFT JOIN properties p ON p.id = i.propertyid AND p.tenant_id = @tenantId
			 WHERE i.id = @invoiceId AND i.tenant_id = @tenantId`,
			{ tenantId, invoiceId }
		);
	} catch (err) {
		console.error('[Invoice Detail] Query error:', err.message);
		throw error(500, 'Failed to load invoice');
	}

	if (!invoice) {
		throw error(404, 'Invoice not found');
	}

	return { invoice, erpnextConfigured: isErpNextConfigured() };
};
