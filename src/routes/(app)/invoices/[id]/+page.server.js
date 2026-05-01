import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { isErpNextConfigured } from '$lib/server/erpnext.js';
import { assertCanSeeInvoice } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const invoiceId = params.id;
	await assertCanSeeInvoice(locals.user, invoiceId);

	let invoice = null;
	try {
		invoice = await runSingleQuery(
			`SELECT i.*,
			        u.name AS tenant_name, u.email AS tenant_email, u.contact_details->>'phone' AS tenant_phone,
			        p.name AS property_name, p.address AS property_address
			 FROM invoices i
			 LEFT JOIN tenants u ON u.id = i.tenant_id
			 LEFT JOIN properties p ON p.id = i.propertyid
			 WHERE i.id = @invoiceId`,
			{ invoiceId }
		);
	} catch (err) {
		console.error('[Invoice Detail] Query error:', err.message);
		throw error(500, 'Failed to load invoice');
	}

	if (!invoice) throw error(404, 'Invoice not found');

	return { invoice, erpnextConfigured: isErpNextConfigured() };
};
