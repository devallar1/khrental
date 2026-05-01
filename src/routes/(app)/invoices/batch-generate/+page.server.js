import { runQuery } from '$api/db/query.js';
import { fail } from '@sveltejs/kit';
import crypto from 'crypto';
import { visibleOrgIds } from '$lib/server/authz.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);
	if (orgs.length === 0) return { properties: [], agreements: [] };

	let properties = [];
	let agreements = [];

	try {
		[properties, agreements] = await Promise.all([
			runQuery(
				`SELECT id, name, address
				 FROM properties
				 WHERE tenant_id = ANY(@orgs::uuid[])
				 ORDER BY name ASC`,
				{ orgs }
			),
			runQuery(
				`SELECT a.id, a.renteeid, a.propertyid, a.rentamount, a.status,
				        u.name AS rentee_name, u.email AS rentee_email
				 FROM agreements a
				 LEFT JOIN rentees u ON u.id = a.renteeid
				 LEFT JOIN properties p ON p.id = a.propertyid
				 WHERE p.owner_org_id = ANY(@orgs::uuid[]) AND a.status = 'active'
				 ORDER BY u.name ASC`,
				{ orgs }
			)
		]);
	} catch (err) {
		console.error('[Batch Generate] Load error:', err.message);
	}

	return { properties, agreements };
};

/** @type {import('./$types').Actions} */
export const actions = {
	generateBatch: async ({ request, locals }) => {
		if (!locals.user?.id) return fail(401, { error: 'Not authenticated' });
		const orgs = await visibleOrgIds(locals.user);

		const formData = await request.formData();
		const propertyIdsRaw = formData.get('propertyIds')?.toString() || '';
		const billingPeriod = formData.get('billingPeriod')?.toString().trim();
		const dueDate = formData.get('dueDate')?.toString().trim();
		const includeRent = formData.get('includeRent') === 'true';
		const notes = formData.get('notes')?.toString().trim() || null;

		if (!propertyIdsRaw || !billingPeriod || !dueDate) {
			return fail(400, { error: 'Properties, billing period, and due date are required.' });
		}

		const propertyIds = JSON.parse(propertyIdsRaw);

		if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
			return fail(400, { error: 'At least one property must be selected.' });
		}

		// Authz: filter the submitted property IDs down to ones the user
		// actually has access to. Anything outside the user's visible
		// orgs is silently dropped here so we don't leak existence.
		let agreements = [];
		try {
			agreements = await runQuery(
				`SELECT a.id, a.renteeid, a.propertyid, a.rentamount,
				        u.name AS rentee_name, u.email AS rentee_email,
				        p.name AS property_name
				 FROM agreements a
				 LEFT JOIN rentees u ON u.id = a.renteeid
				 LEFT JOIN properties p ON p.id = a.propertyid
				 WHERE p.owner_org_id = ANY(@orgs::uuid[]) AND a.status = 'active'
				   AND a.propertyid = ANY(@propertyIds::uuid[])`,
				{ orgs, propertyIds: `{${propertyIds.join(',')}}` }
			);
		} catch (err) {
			console.error('[Batch Generate] Agreements query error:', err.message);
			return fail(500, { error: 'Failed to fetch agreements.' });
		}

		if (agreements.length === 0) {
			return fail(400, { error: 'No active agreements found for the selected properties.' });
		}

		const results = [];
		let successCount = 0;
		let failCount = 0;
		let totalAmount = 0;

		for (const agreement of agreements) {
			const invoiceId = crypto.randomUUID();
			const components = [];

			if (includeRent && agreement.rentamount > 0) {
				components.push({
					description: 'Monthly Rent',
					amount: Number(agreement.rentamount)
				});
			}

			const invoiceTotal = components.reduce((sum, c) => sum + Number(c.amount || 0), 0);

			if (invoiceTotal <= 0) {
				results.push({
					agreementId: agreement.id,
					renteeName: agreement.rentee_name || agreement.rentee_email,
					propertyName: agreement.property_name,
					status: 'skipped',
					reason: 'No billable components',
					invoiceId: null,
					amount: 0
				});
				continue;
			}

			try {
				await runQuery(
					`INSERT INTO invoices (id, renteeid, propertyid, billingperiod, components, totalamount, status, duedate, notes, createdat, updatedat)
					 VALUES (@id, @renteeid, @propertyid, @billingPeriod, @components::jsonb, @totalamount, 'pending', @dueDate, @notes, NOW(), NOW())`,
					{
						id: invoiceId,
						renteeid: agreement.renteeid,
						propertyid: agreement.propertyid,
						billingPeriod,
						components: JSON.stringify(components),
						totalamount: invoiceTotal,
						dueDate,
						notes
					}
				);

				successCount++;
				totalAmount += invoiceTotal;
				results.push({
					agreementId: agreement.id,
					renteeName: agreement.rentee_name || agreement.rentee_email,
					propertyName: agreement.property_name,
					status: 'success',
					invoiceId,
					amount: invoiceTotal
				});
			} catch (err) {
				console.error(`[Batch Generate] Insert error for agreement ${agreement.id}:`, err.message);
				failCount++;
				results.push({
					agreementId: agreement.id,
					renteeName: agreement.rentee_name || agreement.rentee_email,
					propertyName: agreement.property_name,
					status: 'error',
					reason: 'Database insert failed',
					invoiceId: null,
					amount: 0
				});
			}
		}

		return {
			success: true,
			results,
			summary: {
				total: agreements.length,
				created: successCount,
				failed: failCount,
				skipped: agreements.length - successCount - failCount,
				totalAmount
			}
		};
	}
};
