import { runSingleQuery } from '$api/db/query.js';
import { defaultBillingConfig, safeParseBillingConfig } from './config.js';

/**
 * Look up the billing config that was active for an agreement on a given
 * date, by selecting the most recent agreement_billing_events row whose
 * effective_from is on or before that date.
 *
 * Returns the parsed config (or the safe default if no event exists).
 * Always returns *something* — callers don't need to null-check.
 */
export async function getActiveBillingConfig(agreementId, atDate = new Date()) {
	if (!agreementId) return defaultBillingConfig();

	const isoDate = atDate instanceof Date ? atDate.toISOString().slice(0, 10) : String(atDate);

	const row = await runSingleQuery(
		`SELECT config FROM agreement_billing_events
		   WHERE agreement_id = @agreementId
		     AND effective_from <= @atDate
		   ORDER BY effective_from DESC
		   LIMIT 1`,
		{ agreementId, atDate: isoDate }
	);
	if (!row?.config) return defaultBillingConfig();

	const parsed = safeParseBillingConfig(row.config);
	return parsed || defaultBillingConfig();
}

/**
 * Has this agreement *ever* had a billing config event? Used by sendInvoice
 * to decide between the new mode-aware path and the legacy hardcoded path
 * (so old data stays compatible).
 */
export async function agreementHasBillingConfig(agreementId) {
	if (!agreementId) return false;
	const row = await runSingleQuery(
		`SELECT 1 FROM agreement_billing_events WHERE agreement_id = @agreementId LIMIT 1`,
		{ agreementId }
	);
	return Boolean(row);
}
