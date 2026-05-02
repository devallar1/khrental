// Single shared money formatter. Every page that displays a money value
// imports `formatCurrency` from here and passes the row's currency code
// alongside the amount — `formatCurrency(amount, row.currency)`.
//
// Display follows the row's currency, not a global default. Aggregations
// across rows in different currencies are the caller's problem (use the
// invoice/payment fx_rate_to_lkr snapshot).
//
//   formatCurrency(75000, 'LKR') → 'LKR 75,000.00'
//   formatCurrency(2000, 'USD')  → 'US$2,000.00'
//   formatCurrency(null)         → '—'

export const formatCurrency = (amount, currency = 'LKR') => {
	if (amount == null || amount === '') return '—';
	const num = Number(amount);
	if (!Number.isFinite(num)) return '—';
	const code = (currency || 'LKR').toUpperCase();
	try {
		return new Intl.NumberFormat('en-LK', {
			style: 'currency',
			currency: code,
			maximumFractionDigits: 2
		}).format(num);
	} catch {
		// Unknown currency code — fall back to bare number with the code
		// prefixed, rather than throwing.
		return `${code} ${num.toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
	}
};

// For places that just want a number with thousands separators and no
// currency symbol (line-item rows where the column header carries the
// currency, portal pages with a separate currency label, etc.).
export const formatMoney = (amount) => {
	if (amount == null || amount === '') return '—';
	const num = Number(amount);
	if (!Number.isFinite(num)) return '—';
	return new Intl.NumberFormat('en-LK', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(num);
};
