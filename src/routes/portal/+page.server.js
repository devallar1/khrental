import { runSingleQuery, runQuery } from '$api/db/query.js';

/**
 * Tenant cockpit data — the surface tenants land on.
 * Pulls everything they need to "check in" without clicking around:
 *   - profile (identity from auth_user joined with their tenants row)
 *   - active agreement summary (property + unit + rent + end date)
 *   - current bill (most recent unpaid invoice — what they owe right now)
 *   - recent invoices (last 5, history strip with a deep-dive link)
 *
 * @type {import('./$types').PageServerLoad}
 */
export const load = async ({ locals }) => {
	const userId = locals.user.id;
	const orgId = locals.orgId;

	// ── Identity (auth_user joined; phone/email may live there only) ────
	const identity = await runSingleQuery(
		`SELECT au."email"               AS auth_email,
		        au."phoneNumber"         AS auth_phone,
		        au."emailVerified"       AS auth_email_verified,
		        au."phoneNumberVerified" AS auth_phone_verified,
		        au."image"               AS auth_image,
		        au."createdAt"           AS auth_created_at
		   FROM auth_user au
		  WHERE au."id" = @authId
		  LIMIT 1`,
		{ authId: locals.user.auth_id }
	);

	// ── Active agreement (most recent, active preferred) ────────────────
	let agreement = null;
	try {
		agreement = await runSingleQuery(
			`SELECT a.id,
			        a.title,
			        a.status,
			        a.startdate,
			        a.enddate,
			        a.rentamount::float AS rentamount,
			        a.depositamount::float AS depositamount,
			        a.currency,
			        p.name           AS property_name,
			        p.address        AS property_address,
			        p.propertytype   AS property_type,
			        u.unitnumber     AS unit_number,
			        u.floor          AS unit_floor
			   FROM agreements a
			   LEFT JOIN properties p ON p.id = a.propertyid
			   LEFT JOIN property_units u ON u.id = a.unitid
			  WHERE a.renteeid = @userId
			  ORDER BY (a.status = 'active') DESC,
			           COALESCE(a.startdate, a.createdat) DESC
			  LIMIT 1`,
			{ userId }
		);
	} catch (err) {
		console.error('[Portal] Active agreement query failed:', err.message);
	}

	// ── Current bill (most recent unpaid; null if everything's settled) ─
	let currentInvoice = null;
	try {
		currentInvoice = await runSingleQuery(
			`SELECT i.id,
			        i.billingperiod,
			        i.totalamount::float AS totalamount,
			        i.currency,
			        i.status,
			        i.duedate,
			        (CURRENT_DATE - i.duedate)::int AS days_until_due,
			        p.name AS property_name
			   FROM invoices i
			   LEFT JOIN properties p ON p.id = i.propertyid
			  WHERE i.renteeid = @userId
			    AND i.status NOT IN ('paid', 'cancelled')
			  ORDER BY COALESCE(i.duedate, i.createdat) ASC
			  LIMIT 1`,
			{ userId }
		);
	} catch (err) {
		console.error('[Portal] Current invoice query failed:', err.message);
	}

	// ── Recent invoices (last 5) ─────────────────────────────────────────
	let recentInvoices = [];
	try {
		recentInvoices = await runQuery(
			`SELECT i.id,
			        i.billingperiod,
			        i.totalamount::float AS totalamount,
			        i.currency,
			        i.status,
			        i.duedate,
			        i.paymentdate
			   FROM invoices i
			  WHERE i.renteeid = @userId
			  ORDER BY COALESCE(i.duedate, i.createdat) DESC
			  LIMIT 5`,
			{ userId }
		);
	} catch (err) {
		console.error('[Portal] Recent invoices query failed:', err.message);
	}

	// ── Properties associated to this tenant ────────────────────────────
	const associatedIds = Array.isArray(locals.user.associated_property_ids)
		? locals.user.associated_property_ids
		: [];
	let properties = [];
	if (associatedIds.length > 0 && orgId) {
		try {
			properties = await runQuery(
				`SELECT id, name, address, propertytype
				   FROM properties
				  WHERE id = ANY(@ids::uuid[])
				    AND owner_org_id = @orgId
				  ORDER BY name ASC`,
				{ ids: associatedIds, orgId }
			);
		} catch (err) {
			console.error('[Portal] Associated properties query failed:', err.message);
		}
	}

	return {
		profile: {
			name: locals.user.name,
			email: identity?.auth_email || locals.user.email,
			phone: identity?.auth_phone || locals.user.contact_details?.phone || null,
			emailVerified: identity?.auth_email_verified || false,
			phoneVerified: identity?.auth_phone_verified || false,
			image: identity?.auth_image,
			national_id: locals.user.national_id,
			permanent_address: locals.user.permanent_address,
			memberSince: identity?.auth_created_at || locals.user.createdat
		},
		agreement,
		currentInvoice,
		recentInvoices,
		properties
	};
};
