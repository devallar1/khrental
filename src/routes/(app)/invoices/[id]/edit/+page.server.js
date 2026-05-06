import { runSingleQuery } from '$api/db/query.js';
import { error, fail, redirect } from '@sveltejs/kit';
import { assertCanSeeInvoice } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const invoiceId = params.id;
	await assertCanSeeInvoice(locals.user, invoiceId);

	const invoice = await runSingleQuery(
		`SELECT i.*,
		        u.name AS tenant_name, u.email AS tenant_email, u.contact_details->>'phone' AS tenant_phone,
		        p.name AS property_name, p.address AS property_address,
		        u_unit.unitnumber AS unit_unitnumber,
		        u_unit.bank_profile_id,
		        bp.label AS bank_label, bp.account_holder_name, bp.account_number,
		        bp.bank_name, bp.branch
		 FROM invoices i
		 LEFT JOIN tenants u ON u.id = i.tenant_id
		 LEFT JOIN properties p ON p.id = i.propertyid
		 LEFT JOIN agreements a ON a.tenant_id = i.tenant_id AND a.status IN ('signed','active')
		 LEFT JOIN property_units u_unit ON u_unit.id = a.unitid
		 LEFT JOIN bank_profiles bp ON bp.id = u_unit.bank_profile_id
		 WHERE i.id = @invoiceId`,
		{ invoiceId }
	);

	if (!invoice) throw error(404, 'Invoice not found');
	if (invoice.status !== 'draft') {
		throw error(409, 'Only draft invoices are editable. Unlock the invoice first.');
	}

	let components = [];
	if (Array.isArray(invoice.components)) components = invoice.components;
	else if (typeof invoice.components === 'string') {
		try { components = JSON.parse(invoice.components) || []; } catch { components = []; }
	}

	return { invoice, components };
};

/** @type {import('./$types').Actions} */
export const actions = {
	saveEdit: async ({ params, request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		await assertCanSeeInvoice(locals.user, params.id);

		const fd = await request.formData();
		const billingperiod = String(fd.get('billingPeriod') || '').trim();
		const duedate = String(fd.get('dueDate') || '').trim();
		const currency = String(fd.get('currency') || 'LKR').trim().toUpperCase();
		const notes = String(fd.get('notes') || '').trim() || null;
		const componentsRaw = String(fd.get('components') || '[]');

		if (!billingperiod || !duedate) return fail(400, { error: 'Missing required fields' });

		let components = [];
		try {
			components = JSON.parse(componentsRaw);
			if (!Array.isArray(components)) components = [];
		} catch {
			return fail(400, { error: 'Invalid components payload' });
		}

		components = components
			.map((c) => ({
				description: String(c?.description || '').trim(),
				amount: Number(c?.amount || 0)
			}))
			.filter((c) => c.description && Number.isFinite(c.amount) && c.amount !== 0);

		const totalamount = components.reduce((s, c) => s + c.amount, 0);

		// Refuse to edit a non-draft invoice (defence in depth — load() already checks).
		const current = await runSingleQuery(
			`SELECT status FROM invoices WHERE id = @id`,
			{ id: params.id }
		);
		if (!current) return fail(404, { error: 'Invoice not found' });
		if (current.status !== 'draft') {
			return fail(409, { error: 'Invoice is locked. Unlock it before editing.' });
		}

		try {
			await runSingleQuery(
				`UPDATE invoices
				 SET billingperiod = @billingperiod,
				     duedate       = @duedate,
				     currency      = @currency,
				     notes         = @notes,
				     components    = @components::jsonb,
				     totalamount   = @totalamount,
				     updatedat     = NOW()
				 WHERE id = @id`,
				{
					id: params.id,
					billingperiod,
					duedate,
					currency,
					notes,
					components: JSON.stringify(components),
					totalamount
				}
			);

			await runSingleQuery(
				`INSERT INTO invoice_audit_log (invoice_id, user_id, action, snapshot)
				 VALUES (@invoiceId, @userId, 'edited', @snapshot::jsonb)`,
				{
					invoiceId: params.id,
					userId: locals.user.id,
					snapshot: JSON.stringify({
						components,
						totalamount,
						notes,
						status: 'draft',
						billingperiod,
						duedate,
						currency
					})
				}
			);
		} catch (err) {
			console.error('[Invoice Edit] Update error:', err.message);
			return fail(500, { error: 'Failed to save changes' });
		}

		throw redirect(303, `/invoices/${params.id}`);
	}
};
