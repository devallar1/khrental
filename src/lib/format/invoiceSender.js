// Resolve the "sender" name shown at the top of an invoice (print template,
// plain-text export, etc.) given the row joined with org + routed bank
// profile fields.
//
// Default behaviour is to show the property's owning organization name —
// that's correct for most orgs (companies). Some orgs are family-style
// holdings where the invoice should instead show the routed bank account's
// holder name (e.g. "Choot HNB Kaduwela" → "Choot"). Today this applies
// only to the Kubeira Family org, identified by slug.
//
// Add more slugs here as they come up, or move the rule onto the
// organizations table (e.g. `invoice_sender = 'org_name' | 'bank_holder'`)
// once we have a third case.

const BANK_HOLDER_ORG_SLUGS = new Set(['kubeira-family']);

/**
 * @param {{ org_slug?: string|null, org_name?: string|null, bank_holder_name?: string|null }} row
 * @returns {string} display name for the invoice header
 */
export function resolveInvoiceSenderName(row) {
	if (!row) return '';
	if (row.org_slug && BANK_HOLDER_ORG_SLUGS.has(row.org_slug)) {
		return row.bank_holder_name || row.org_name || '';
	}
	return row.org_name || '';
}
