import { runSingleQuery } from '$api/db/query.js';
import { error } from '@sveltejs/kit';
import { assertCanSeeInvoice } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, locals }) => {
	const invoiceId = params.id;
	await assertCanSeeInvoice(locals.user, invoiceId);

	let invoice = null;
	try {
		invoice = await runSingleQuery(
			`SELECT i.*,
			        u.name AS tenant_name, u.email AS tenant_email,
			        u.contact_details->>'phone' AS tenant_phone,
			        u.contact_details->>'address' AS tenant_address,
			        p.name AS property_name, p.address AS property_address,
			        p.owner_org_id,
			        o.name AS org_name, o.slug AS org_slug,
			        bp.account_holder_name AS bank_holder_name,
			        bp.bank_name AS bank_name, bp.branch AS bank_branch,
			        bp.account_number AS bank_account_number
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
			 WHERE i.id = @invoiceId`,
			{ invoiceId }
		);
	} catch (err) {
		console.error('[Invoice Print] Query error:', err.message);
		throw error(500, 'Failed to load invoice');
	}

	if (!invoice) throw error(404, 'Invoice not found');
	if (invoice.status === 'draft') {
		throw error(409, 'Invoice is still a draft — lock it before printing');
	}

	return { invoice };
};
