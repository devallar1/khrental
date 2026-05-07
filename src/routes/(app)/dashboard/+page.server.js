import { runQuery, runSingleQuery } from '$api/db/query.js';
import { visibleOrgIds } from '$lib/server/authz.js';

/**
 * Manager cockpit — the analytical surface (the "knowing" mode).
 * Different from /manager (the workshop / "doing" mode) and the structured
 * routes (the toolbox / "deep edit" mode). Tiles surface temporal + financial
 * + risk information not visible at a glance from the manager canvas.
 *
 * Every tile is scoped to the user's visible orgs via visibleOrgIds().
 * Failures degrade gracefully — a single broken query returns zero, not 500.
 *
 * @type {import('./$types').PageServerLoad}
 */
export const load = async ({ locals }) => {
	const orgs = await visibleOrgIds(locals.user);

	const empty = {
		financial: { billed: 0, collected: 0, outstanding: 0, rate: null, count: 0 },
		triage: { overdueCount: 0, overdueAmount: 0, expiring30: 0, expiring60: 0, expiring90: 0 },
		counts: { properties: 0, tenants: 0, agreements: 0, invoices: 0 },
		topOverdue: [],
		recent: []
	};

	if (orgs.length === 0) return empty;

	// Run independent queries in parallel; each wrapped so a single failure
	// degrades to its safe default rather than 500ing the whole page.
	const safeFinancial = async () => {
		try {
			return await runSingleQuery(
				`SELECT
					COALESCE(SUM(i.totalamount), 0)::float AS billed,
					COALESCE(SUM(i.totalamount) FILTER (WHERE i.status = 'paid'), 0)::float AS collected,
					COALESCE(SUM(i.totalamount) FILTER (WHERE i.status NOT IN ('paid', 'cancelled')), 0)::float AS outstanding,
					COUNT(*)::int AS count
				 FROM invoices i
				 JOIN properties p ON p.id = i.propertyid
				 WHERE p.owner_org_id = ANY(@orgs::uuid[])
				   AND i.createdat >= date_trunc('month', CURRENT_DATE)
				   AND i.createdat < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
				{ orgs }
			);
		} catch (err) {
			console.error('[Dashboard] Financial query failed:', err.message);
			return null;
		}
	};

	const safeTriage = async () => {
		try {
			const [overdue, expiring] = await Promise.all([
				runSingleQuery(
					`SELECT
						COUNT(*)::int AS overdue_count,
						COALESCE(SUM(i.totalamount), 0)::float AS overdue_amount
					 FROM invoices i
					 JOIN properties p ON p.id = i.propertyid
					 WHERE p.owner_org_id = ANY(@orgs::uuid[])
					   AND i.duedate < CURRENT_DATE
					   AND i.status NOT IN ('paid', 'cancelled')`,
					{ orgs }
				),
				runSingleQuery(
					`SELECT
						COUNT(*) FILTER (WHERE a.enddate <= CURRENT_DATE + INTERVAL '30 days')::int AS expiring_30,
						COUNT(*) FILTER (WHERE a.enddate > CURRENT_DATE + INTERVAL '30 days' AND a.enddate <= CURRENT_DATE + INTERVAL '60 days')::int AS expiring_60,
						COUNT(*) FILTER (WHERE a.enddate > CURRENT_DATE + INTERVAL '60 days' AND a.enddate <= CURRENT_DATE + INTERVAL '90 days')::int AS expiring_90
					 FROM agreements a
					 JOIN properties p ON p.id = a.propertyid
					 WHERE p.owner_org_id = ANY(@orgs::uuid[])
					   AND a.status = 'active'
					   AND a.enddate IS NOT NULL
					   AND a.enddate >= CURRENT_DATE`,
					{ orgs }
				)
			]);
			return {
				overdueCount: overdue?.overdue_count || 0,
				overdueAmount: overdue?.overdue_amount || 0,
				expiring30: expiring?.expiring_30 || 0,
				expiring60: expiring?.expiring_60 || 0,
				expiring90: expiring?.expiring_90 || 0
			};
		} catch (err) {
			console.error('[Dashboard] Triage query failed:', err.message);
			return empty.triage;
		}
	};

	const safeCounts = async () => {
		try {
			const [properties, tenants, agreements, invoices] = await Promise.all([
				runSingleQuery(
					`SELECT COUNT(*)::int AS count FROM properties WHERE owner_org_id = ANY(@orgs::uuid[])`,
					{ orgs }
				),
				runSingleQuery(
					`SELECT COUNT(*)::int AS count FROM tenants WHERE org_id = ANY(@orgs::uuid[])`,
					{ orgs }
				),
				runSingleQuery(
					`SELECT COUNT(*)::int AS count FROM agreements a
					   JOIN properties p ON p.id = a.propertyid
					  WHERE p.owner_org_id = ANY(@orgs::uuid[])
					    AND a.status = 'active'`,
					{ orgs }
				),
				runSingleQuery(
					`SELECT COUNT(*)::int AS count FROM invoices i
					   JOIN properties p ON p.id = i.propertyid
					  WHERE p.owner_org_id = ANY(@orgs::uuid[])
					    AND i.status NOT IN ('paid', 'cancelled')`,
					{ orgs }
				)
			]);
			return {
				properties: properties?.count || 0,
				tenants: tenants?.count || 0,
				agreements: agreements?.count || 0,
				invoices: invoices?.count || 0
			};
		} catch (err) {
			console.error('[Dashboard] Counts query failed:', err.message);
			return empty.counts;
		}
	};

	const safeTopOverdue = async () => {
		try {
			return await runQuery(
				`SELECT
					i.id, i.billingperiod, i.totalamount::float, i.duedate,
					(CURRENT_DATE - i.duedate)::int AS days_overdue,
					p.name AS property_name,
					t.name AS tenant_name,
					t.id AS tenant_id
				 FROM invoices i
				 JOIN properties p ON p.id = i.propertyid
				 LEFT JOIN tenants t ON t.id = i.tenant_id
				 WHERE p.owner_org_id = ANY(@orgs::uuid[])
				   AND i.duedate < CURRENT_DATE
				   AND i.status NOT IN ('paid', 'cancelled')
				 ORDER BY i.duedate ASC
				 LIMIT 5`,
				{ orgs }
			);
		} catch (err) {
			console.error('[Dashboard] Top-overdue query failed:', err.message);
			return [];
		}
	};

	const safeRecent = async () => {
		try {
			return await runQuery(
				`(SELECT 'agreement'::text AS type, a.id, a.title AS subject, a.createdat AS event_at,
				          p.name AS property_name, t.name AS tenant_name, NULL::float AS amount
				    FROM agreements a
				    JOIN properties p ON p.id = a.propertyid
				    LEFT JOIN tenants t ON t.id = a.tenant_id
				   WHERE p.owner_org_id = ANY(@orgs::uuid[])
				     AND a.createdat >= CURRENT_DATE - INTERVAL '7 days')
				 UNION ALL
				 (SELECT 'payment'::text AS type, i.id, i.billingperiod AS subject, i.paymentdate AS event_at,
				          p.name AS property_name, t.name AS tenant_name, i.totalamount::float AS amount
				    FROM invoices i
				    JOIN properties p ON p.id = i.propertyid
				    LEFT JOIN tenants t ON t.id = i.tenant_id
				   WHERE p.owner_org_id = ANY(@orgs::uuid[])
				     AND i.status = 'paid'
				     AND i.paymentdate >= CURRENT_DATE - INTERVAL '7 days')
				 ORDER BY event_at DESC
				 LIMIT 10`,
				{ orgs }
			);
		} catch (err) {
			console.error('[Dashboard] Recent activity query failed:', err.message);
			return [];
		}
	};

	const [financialRow, triage, counts, topOverdue, recent] = await Promise.all([
		safeFinancial(),
		safeTriage(),
		safeCounts(),
		safeTopOverdue(),
		safeRecent()
	]);

	const financial = financialRow
		? {
				billed: financialRow.billed || 0,
				collected: financialRow.collected || 0,
				outstanding: financialRow.outstanding || 0,
				count: financialRow.count || 0,
				rate: financialRow.billed > 0 ? financialRow.collected / financialRow.billed : null
			}
		: empty.financial;

	return { financial, triage, counts, topOverdue, recent };
};
