/**
 * Pure calculator functions per utility. Each takes the relevant slice of a
 * billing config and the inputs needed to bill (e.g. previous + current meter
 * reading), and returns either a component object or `null` if this utility
 * is skipped on the invoice (`client_managed` / `none`).
 *
 * Component shape (matches existing invoices.components JSONB convention):
 *   {
 *     label: 'ELECTRICITY',
 *     amount: number,
 *     details: { mode, ... mode-specific fields ... }
 *   }
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function calcRent(config, rentAmount) {
	const cfg = config?.rent;
	if (!cfg || cfg.mode === 'client_managed') return null;
	return {
		label: 'RENT',
		amount: round2(rentAmount || 0),
		details: { mode: 'fixed', source: 'agreements.rentamount' }
	};
}

export function calcElectricity(config, { prevReading, currentReading } = {}) {
	const cfg = config?.electricity;
	if (!cfg || cfg.mode === 'client_managed') return null;

	if (cfg.mode === 'fixed') {
		return {
			label: 'ELECTRICITY',
			amount: round2(cfg.fixed_lkr),
			details: { mode: 'fixed', fixed_lkr: cfg.fixed_lkr }
		};
	}

	if (cfg.mode === 'unit_based') {
		const prev = Number(prevReading) || 0;
		const curr = Number(currentReading) || 0;
		const consumed = Math.max(0, curr - prev);
		const amount = round2(consumed * cfg.rate);
		return {
			label: 'ELECTRICITY',
			amount,
			details: {
				mode: 'unit_based',
				rate: cfg.rate,
				prev_reading: prev,
				current_reading: curr,
				units_consumed: consumed
			}
		};
	}

	if (cfg.mode === 'solar_offset') {
		// Solar offset: bill the rentee for whatever the solar generated above
		// the offset threshold (e.g. KIT: subtract 500 units, multiply by 22 LKR/unit).
		const curr = Number(currentReading) || 0;
		const billable = Math.max(0, curr - (cfg.offset_units || 0));
		const amount = round2(billable * cfg.rate);
		return {
			label: 'ELECTRICITY',
			amount,
			details: {
				mode: 'solar_offset',
				rate: cfg.rate,
				offset_units: cfg.offset_units,
				solar_units: curr,
				billable_units: billable
			}
		};
	}

	return null;
}

export function calcWater(config, { prevReading, currentReading } = {}) {
	const cfg = config?.water;
	if (!cfg || cfg.mode === 'client_managed') return null;

	if (cfg.mode === 'fixed') {
		return {
			label: 'WATER',
			amount: round2(cfg.fixed_lkr),
			details: { mode: 'fixed', fixed_lkr: cfg.fixed_lkr }
		};
	}

	if (cfg.mode === 'unit_based') {
		const prev = Number(prevReading) || 0;
		const curr = Number(currentReading) || 0;
		const consumed = Math.max(0, curr - prev);
		const amount = round2(consumed * cfg.rate);
		return {
			label: 'WATER',
			amount,
			details: {
				mode: 'unit_based',
				rate: cfg.rate,
				prev_reading: prev,
				current_reading: curr,
				units_consumed: consumed
			}
		};
	}

	return null;
}

export function calcSlt(config, { passthroughLkr } = {}) {
	const cfg = config?.slt;
	if (!cfg || cfg.mode === 'client_managed' || cfg.mode === 'none') return null;

	if (cfg.mode === 'fixed') {
		return {
			label: 'SLT',
			amount: round2(cfg.fixed_lkr),
			details: { mode: 'fixed', fixed_lkr: cfg.fixed_lkr }
		};
	}

	if (cfg.mode === 'passthrough') {
		// Manager has to enter the actual SLT invoice value before we can
		// finalize this line. Returning null with a `pending` marker tells
		// sendInvoice to either skip or block the invoice depending on policy.
		if (passthroughLkr == null) {
			return { label: 'SLT', amount: 0, details: { mode: 'passthrough', pending: true } };
		}
		return {
			label: 'SLT',
			amount: round2(passthroughLkr),
			details: { mode: 'passthrough', invoice_lkr: passthroughLkr }
		};
	}

	return null;
}

/**
 * Compose a full invoice components array from a billing config + inputs.
 * Returns components in display order (rent first, then utilities) and
 * nulls (skipped lines) filtered out.
 */
export function buildInvoiceComponents(config, inputs = {}) {
	const lines = [
		calcRent(config, inputs.rentAmount),
		calcElectricity(config, inputs.electricity),
		calcWater(config, inputs.water),
		calcSlt(config, inputs.slt)
	].filter(Boolean);
	const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
	return { components: lines, total: round2(total) };
}
