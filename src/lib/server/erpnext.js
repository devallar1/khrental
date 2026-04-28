const ERPNEXT_URL = process.env.ERPNEXT_URL || 'http://localhost:8080';
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY || '';
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET || '';

/**
 * Tenant slug to ERPNext company name mapping
 */
const TENANT_COMPANY_MAP = {
	'kubeira-it-park': 'Kubeira IT Park Private Limited',
	'kubeira-holdings': 'Kubeira Holdings Private Limited',
	'kubeira-family': 'Kubeira Family',
	'the-nescius': 'The Nescius Private Limited'
};

/**
 * ERPNext company configuration mapping
 */
const COMPANY_CONFIG = {
	'Kubeira IT Park Private Limited': {
		income_account: 'Service - KIT',
		debit_to: 'Debtors - KIT',
		cost_center: 'Main - KIT',
		naming_series: 'KIT/.###'
	},
	'Kubeira Holdings Private Limited': {
		income_account: '4120 - Service - KH',
		debit_to: '1310 - Debtors - KH',
		cost_center: 'Main - KH',
		naming_series: 'KH/.###'
	},
	'Kubeira Family': {
		income_account: 'Service - KF',
		debit_to: 'Debtors - KF',
		cost_center: 'Main - KF',
		naming_series: 'KF/.###'
	},
	'The Nescius Private Limited': {
		income_account: 'Service - TN',
		debit_to: 'Debtors - TN',
		cost_center: 'Main - TN',
		naming_series: 'TN/.###'
	}
};

/**
 * Check whether ERPNext integration is configured via environment variables.
 */
export function isErpNextConfigured() {
	return Boolean(ERPNEXT_API_KEY && ERPNEXT_API_SECRET);
}

/**
 * Returns the company configuration mapping object.
 */
export function getErpNextCompanyMapping() {
	return COMPANY_CONFIG;
}

/**
 * Build the authorization header for ERPNext API calls.
 */
function authHeaders() {
	return {
		Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
		'Content-Type': 'application/json'
	};
}

/**
 * GET a single ERPNext document.
 * @param {string} doctype - e.g. "Sales Invoice"
 * @param {string} name - document ID / name
 * @returns {Promise<object>}
 */
export async function erpNextGet(doctype, name) {
	const url = `${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`;
	const res = await fetch(url, { headers: authHeaders() });

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`ERPNext GET ${doctype}/${name} failed (${res.status}): ${body}`);
	}

	const json = await res.json();
	return json.data;
}

/**
 * List ERPNext documents with optional filters.
 * @param {string} doctype
 * @param {object|Array} [filters] - ERPNext filter format
 * @param {string[]} [fields] - fields to return
 * @param {number} [limit] - page length
 * @returns {Promise<object[]>}
 */
export async function erpNextList(doctype, filters = {}, fields = ['name'], limit = 20) {
	const params = new URLSearchParams();
	params.set('filters', JSON.stringify(filters));
	params.set('fields', JSON.stringify(fields));
	params.set('limit_page_length', String(limit));

	const url = `${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`;
	const res = await fetch(url, { headers: authHeaders() });

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`ERPNext LIST ${doctype} failed (${res.status}): ${body}`);
	}

	const json = await res.json();
	return json.data || [];
}

/**
 * Create a new ERPNext document (saved as draft, docstatus=0).
 * @param {string} doctype
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function erpNextCreate(doctype, data) {
	const url = `${ERPNEXT_URL}/api/resource/${encodeURIComponent(doctype)}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify(data)
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`ERPNext CREATE ${doctype} failed (${res.status}): ${body}`);
	}

	const json = await res.json();
	return json.data;
}

/**
 * Parse invoice components from JSONB into a flat array.
 */
function parseComponents(components) {
	if (!components) return [];
	if (typeof components === 'string') {
		try {
			return JSON.parse(components);
		} catch {
			return [];
		}
	}
	return Array.isArray(components) ? components : [];
}

/**
 * Resolve the ERPNext company name from a tenant object.
 * Falls back to searching by slug if name doesn't match.
 */
function resolveCompany(tenant) {
	if (!tenant) return null;

	// Try slug mapping first
	if (tenant.slug && TENANT_COMPANY_MAP[tenant.slug]) {
		return TENANT_COMPANY_MAP[tenant.slug];
	}

	// Try matching tenant name directly against known company names
	const companyNames = Object.keys(COMPANY_CONFIG);
	const match = companyNames.find(
		(c) => c.toLowerCase() === (tenant.name || '').toLowerCase()
	);
	return match || null;
}

/**
 * Look up an ERPNext customer by name (partial match).
 * @param {string} name
 * @returns {Promise<string|null>} customer name in ERPNext
 */
async function findErpNextCustomer(name) {
	if (!name) return null;

	try {
		// Search for exact match first
		const exact = await erpNextList(
			'Customer',
			[['customer_name', '=', name]],
			['name', 'customer_name'],
			1
		);
		if (exact.length > 0) return exact[0].name;

		// Try a LIKE search
		const partial = await erpNextList(
			'Customer',
			[['customer_name', 'like', `%${name}%`]],
			['name', 'customer_name'],
			5
		);
		if (partial.length > 0) return partial[0].name;
	} catch (err) {
		console.error('[ERPNext] Customer lookup failed:', err.message);
	}

	return null;
}

/**
 * Sync a local invoice to ERPNext as a draft Sales Invoice.
 *
 * @param {object} invoice - Invoice row from DB (with components JSONB)
 * @param {object} tenant  - Tenant object with { name, slug }
 * @param {object} rentee  - Rentee/customer info with { name, email }
 * @returns {Promise<{ success: boolean, name?: string, error?: string }>}
 */
export async function syncInvoiceToErpNext(invoice, tenant, rentee) {
	try {
		if (!isErpNextConfigured()) {
			return { success: false, error: 'ERPNext integration is not configured' };
		}

		// 1. Resolve company
		const companyName = resolveCompany(tenant);
		if (!companyName) {
			return {
				success: false,
				error: `No ERPNext company mapping found for tenant "${tenant?.name || tenant?.slug || 'unknown'}"`
			};
		}

		const config = COMPANY_CONFIG[companyName];
		if (!config) {
			return { success: false, error: `No configuration found for company "${companyName}"` };
		}

		// 2. Resolve ERPNext customer
		const renteeName = rentee?.name || rentee?.fullname || '';
		const customerName = await findErpNextCustomer(renteeName);
		if (!customerName) {
			return {
				success: false,
				error: `Could not find ERPNext customer matching "${renteeName}". Please create the customer in ERPNext first.`
			};
		}

		// 3. Build line items from invoice components
		const components = parseComponents(invoice.components);
		let items;

		if (components.length > 0) {
			items = components.map((comp) => ({
				item_code: comp.name || comp.description || 'Service',
				description: comp.description || comp.name || 'Invoice line item',
				qty: 1,
				rate: Number(comp.amount) || 0,
				income_account: config.income_account,
				cost_center: config.cost_center
			}));
		} else {
			// Single line item using total amount
			items = [
				{
					item_code: 'Rent',
					description: `Invoice for ${invoice.billingperiod || 'billing period'}`,
					qty: 1,
					rate: Number(invoice.totalamount) || 0,
					income_account: config.income_account,
					cost_center: config.cost_center
				}
			];
		}

		// 4. Determine dates
		const postingDate = invoice.createdat
			? new Date(invoice.createdat).toISOString().split('T')[0]
			: new Date().toISOString().split('T')[0];

		const dueDate = invoice.duedate
			? new Date(invoice.duedate).toISOString().split('T')[0]
			: postingDate;

		// 5. Build the Sales Invoice document
		const salesInvoice = {
			doctype: 'Sales Invoice',
			docstatus: 0, // Keep as draft
			naming_series: config.naming_series,
			company: companyName,
			customer: customerName,
			posting_date: postingDate,
			due_date: dueDate,
			currency: 'LKR',
			debit_to: config.debit_to,
			items
		};

		// 6. Create in ERPNext
		const created = await erpNextCreate('Sales Invoice', salesInvoice);

		console.info('[ERPNext] Sales Invoice created:', created.name);
		return { success: true, name: created.name };
	} catch (err) {
		console.error('[ERPNext] syncInvoiceToErpNext failed:', err.message);
		return { success: false, error: err.message };
	}
}
