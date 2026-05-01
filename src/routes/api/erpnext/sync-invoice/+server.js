import { json } from '@sveltejs/kit';
import { runSingleQuery } from '$api/db/query.js';
import { syncInvoiceToErpNext, isErpNextConfigured } from '$lib/server/erpnext.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!isErpNextConfigured()) {
		return json({ success: false, error: 'ERPNext integration is not configured' }, { status: 501 });
	}

	const tenantId = locals.tenantId;
	if (!tenantId) {
		return json({ success: false, error: 'No tenant context' }, { status: 403 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const { invoiceId } = body;
	if (!invoiceId) {
		return json({ success: false, error: 'invoiceId is required' }, { status: 400 });
	}

	// Load invoice with tenant and rentee info
	let invoice;
	try {
		invoice = await runSingleQuery(
			`SELECT i.*,
			        u.name AS rentee_name, u.email AS rentee_email, u.contact_details->>'phone' AS rentee_phone,
			        p.name AS property_name, p.address AS property_address,
			        o.name AS tenant_name, o.slug AS tenant_slug
			 FROM invoices i
			 LEFT JOIN rentees u ON u.id = i.renteeid
			 LEFT JOIN properties p ON p.id = i.propertyid
			 LEFT JOIN organizations o ON o.id = p.owner_org_id
			 WHERE i.id = @invoiceId
			   AND (p.owner_org_id = @tenantId OR p.owner_user_id = @tenantId)`,
			{ tenantId, invoiceId }
		);
	} catch (err) {
		console.error('[ERPNext Sync] Query error:', err.message);
		return json({ success: false, error: 'Failed to load invoice' }, { status: 500 });
	}

	if (!invoice) {
		return json({ success: false, error: 'Invoice not found' }, { status: 404 });
	}

	// Build tenant and rentee objects for the sync function
	const tenant = {
		name: invoice.tenant_name,
		slug: invoice.tenant_slug
	};

	const rentee = {
		name: invoice.rentee_name,
		email: invoice.rentee_email
	};

	// Sync to ERPNext
	const result = await syncInvoiceToErpNext(invoice, tenant, rentee);

	if (!result.success) {
		return json({ success: false, error: result.error }, { status: 422 });
	}

	return json({
		success: true,
		erpnextInvoice: result.name
	});
}
