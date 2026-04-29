import { runSingleQuery } from '$api/db/query.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const userId = locals.user.id;
	const tenantId = locals.tenantId;

	// Most recent agreement for this rentee. If they have history, this picks
	// the latest one by start date; "active" status preferred when ties.
	const agreement = await runSingleQuery(
		`SELECT a.id,
		        a.title,
		        a.status,
		        a.startdate,
		        a.enddate,
		        a.rentamount,
		        a.depositamount,
		        a.terms,
		        a.notes,
		        a.documenturl,
		        a.signed_document_url,
		        a.signeddocumenturl,
		        a.pdfurl,
		        a.signature_status,
		        a.signeddate,
		        a.createdat,
		        p.name AS property_name,
		        p.address AS property_address,
		        p.propertytype AS property_type,
		        u.unitnumber AS unit_number,
		        u.floor AS unit_floor
		   FROM agreements a
		   LEFT JOIN properties p ON p.id = a.propertyid
		   LEFT JOIN property_units u ON u.id = a.unitid
		  WHERE a.renteeid = @userId
		    AND a.tenant_id = @tenantId
		  ORDER BY (a.status = 'active') DESC,
		           COALESCE(a.startdate, a.createdat) DESC
		  LIMIT 1`,
		{ userId, tenantId }
	);

	return { agreement };
};
