import { runSingleQuery, runQuery } from '$api/db/query.js';
import { error, fail } from '@sveltejs/kit';
import { isErpNextConfigured } from '$lib/server/erpnext.js';
import { assertCanSeeInvoice } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const invoiceId = params.id;
	await assertCanSeeInvoice(locals.user, invoiceId);

	let invoice = null;
	let auditLog = [];
	try {
		invoice = await runSingleQuery(
			`SELECT i.*,
			        u.name AS tenant_name, u.email AS tenant_email, u.contact_details->>'phone' AS tenant_phone,
			        p.name AS property_name, p.address AS property_address,
			        o.name AS org_name, o.slug AS org_slug,
			        bp.account_holder_name AS bank_holder_name,
			        lb.name AS locked_by_name
			 FROM invoices i
			 LEFT JOIN tenants u ON u.id = i.tenant_id
			 LEFT JOIN properties p ON p.id = i.propertyid
			 LEFT JOIN organizations o ON o.id = p.owner_org_id
			 LEFT JOIN LATERAL (
			   SELECT a.unitid FROM agreements a
			    WHERE a.tenant_id = i.tenant_id AND a.status IN ('signed','active')
			    ORDER BY a.startdate DESC NULLS LAST
			    LIMIT 1
			 ) ag ON TRUE
			 LEFT JOIN property_units pu ON pu.id = ag.unitid
			 LEFT JOIN bank_profiles bp ON bp.id = pu.bank_profile_id
			 LEFT JOIN app_users lb ON lb.id = i.locked_by
			 WHERE i.id = @invoiceId`,
			{ invoiceId }
		);

		auditLog = await runQuery(
			`SELECT al.id, al.action, al.snapshot, al.note, al.created_at,
			        au.name AS user_name, au.email AS user_email
			 FROM invoice_audit_log al
			 LEFT JOIN app_users au ON au.id = al.user_id
			 WHERE al.invoice_id = @invoiceId
			 ORDER BY al.created_at DESC`,
			{ invoiceId }
		);
	} catch (err) {
		console.error('[Invoice Detail] Query error:', err.message);
		throw error(500, 'Failed to load invoice');
	}

	if (!invoice) throw error(404, 'Invoice not found');

	return { invoice, auditLog, erpnextConfigured: isErpNextConfigured() };
};

const writeAudit = async (invoiceId, userId, action, snapshot) => {
	await runSingleQuery(
		`INSERT INTO invoice_audit_log (invoice_id, user_id, action, snapshot)
		 VALUES (@invoiceId, @userId, @action, @snapshot::jsonb)`,
		{
			invoiceId,
			userId,
			action,
			snapshot: snapshot ? JSON.stringify(snapshot) : null
		}
	);
};

const loadInvoiceSnapshot = async (invoiceId) => {
	const row = await runSingleQuery(
		`SELECT components, totalamount, notes, status, billingperiod, duedate, currency
		 FROM invoices WHERE id = @invoiceId`,
		{ invoiceId }
	);
	return row || null;
};

/** @type {import('./$types').Actions} */
export const actions = {
	lock: async ({ params, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		await assertCanSeeInvoice(locals.user, params.id);

		const invoice = await loadInvoiceSnapshot(params.id);
		if (!invoice) return fail(404, { error: 'Invoice not found' });
		if (invoice.status !== 'draft') {
			return fail(400, { error: 'Only draft invoices can be locked' });
		}

		try {
			await runSingleQuery(
				`UPDATE invoices
				 SET status = 'locked',
				     locked_at = NOW(),
				     locked_by = @userId,
				     updatedat = NOW()
				 WHERE id = @invoiceId`,
				{ invoiceId: params.id, userId: locals.user.id }
			);
			await writeAudit(params.id, locals.user.id, 'locked', { ...invoice, status: 'locked' });
		} catch (err) {
			console.error('[Invoice Lock] Error:', err.message);
			return fail(500, { error: 'Failed to lock invoice' });
		}

		return { ok: true, action: 'lock' };
	},

	unlock: async ({ params, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		await assertCanSeeInvoice(locals.user, params.id);

		const invoice = await loadInvoiceSnapshot(params.id);
		if (!invoice) return fail(404, { error: 'Invoice not found' });
		if (invoice.status !== 'locked') {
			return fail(400, { error: 'Only locked invoices can be unlocked' });
		}

		try {
			await runSingleQuery(
				`UPDATE invoices
				 SET status = 'draft',
				     locked_at = NULL,
				     locked_by = NULL,
				     updatedat = NOW()
				 WHERE id = @invoiceId`,
				{ invoiceId: params.id }
			);
			await writeAudit(params.id, locals.user.id, 'unlocked', { ...invoice, status: 'draft' });
		} catch (err) {
			console.error('[Invoice Unlock] Error:', err.message);
			return fail(500, { error: 'Failed to unlock invoice' });
		}

		return { ok: true, action: 'unlock' };
	}
};
