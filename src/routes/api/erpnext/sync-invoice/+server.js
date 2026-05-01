import { json } from '@sveltejs/kit';
import { runSingleQuery } from '$api/db/query.js';
import { syncInvoiceToErpNext, isErpNextConfigured } from '$lib/server/erpnext.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
	if (!isErpNextConfigured()) {
		return json({ success: false, error: 'ERPNext integration is not configured' }, { status: 501 });
	}

	const orgId = locals.orgId;
	if (!orgId) {
		return json({ success: false, error: 'No org context' }, { status: 403 });
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
			        u.name AS tenant_name, u.email AS tenant_email, u.contact_details->>'phone' AS tenant_phone,
			        p.name AS property_name, p.address AS property_address,
			        o.name AS org_name, o.slug AS org_slug
			 FROM invoices i
			 LEFT JOIN tenants u ON u.id = i.tenant_id
			 LEFT JOIN properties p ON p.id = i.propertyid
			 LEFT JOIN organizations o ON o.id = p.owner_org_id
			 WHERE i.id = @invoiceId
			   AND (p.owner_org_id = @orgId OR p.owner_user_id = @orgId)`,
			{ orgId, invoiceId }
		);
	} catch (err) {
		console.error('[ERPNext Sync] Query error:', err.message);
		return json({ success: false, error: 'Failed to load invoice' }, { status: 500 });
	}

	if (!invoice) {
		return json({ success: false, error: 'Invoice not found' }, { status: 404 });
	}

	// Build org and tenant objects for the sync function.
	const org = {
		name: invoice.org_name,
		slug: invoice.org_slug
	};

	const tenant = {
		name: invoice.tenant_name,
		email: invoice.tenant_email
	};

	// Sync to ERPNext
	const result = await syncInvoiceToErpNext(invoice, org, tenant);

	if (!result.success) {
		return json({ success: false, error: result.error }, { status: 422 });
	}

	return json({
		success: true,
		erpnextInvoice: result.name
	});
}
