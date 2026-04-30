/**
 * Per-agreement billing configuration — the shape of `agreement_billing_events.config`.
 *
 * Stored as JSONB in Postgres (no constraint), validated here on the server
 * before insert. This is the single source of truth for what a billing
 * config can look like; the rentee form serializes into this shape, the
 * invoice calculators consume it.
 */

import { z } from 'zod';

const positiveNumber = z.number().nonnegative();

const electricityModeSchema = z.discriminatedUnion('mode', [
	z.object({ mode: z.literal('fixed'),         fixed_lkr: positiveNumber }),
	z.object({ mode: z.literal('unit_based'),    rate: positiveNumber, initial_reading: positiveNumber }),
	z.object({
		mode: z.literal('solar_offset'),
		rate: positiveNumber,
		offset_units: positiveNumber,
		initial_reading: positiveNumber
	}),
	z.object({ mode: z.literal('client_managed') })
]);

const waterModeSchema = z.discriminatedUnion('mode', [
	z.object({ mode: z.literal('fixed'),         fixed_lkr: positiveNumber }),
	z.object({ mode: z.literal('unit_based'),    rate: positiveNumber, initial_reading: positiveNumber }),
	z.object({ mode: z.literal('client_managed') })
]);

const sltModeSchema = z.discriminatedUnion('mode', [
	z.object({ mode: z.literal('passthrough') }),
	z.object({ mode: z.literal('fixed'),         fixed_lkr: positiveNumber }),
	z.object({ mode: z.literal('client_managed') }),
	z.object({ mode: z.literal('none') })
]);

const rentModeSchema = z.discriminatedUnion('mode', [
	// Fixed amount; the value lives on agreements.rentamount itself.
	z.object({ mode: z.literal('fixed') }),
	z.object({ mode: z.literal('client_managed') })
]);

export const billingConfigSchema = z.object({
	rent:        rentModeSchema,
	electricity: electricityModeSchema,
	water:       waterModeSchema,
	slt:         sltModeSchema
});

/**
 * Default config used when a brand-new agreement is created and the manager
 * hasn't filled in billing yet — everything is `client_managed` so invoices
 * come out empty until configured (no surprise inflated bills).
 */
export const defaultBillingConfig = () => ({
	rent:        { mode: 'fixed' },
	electricity: { mode: 'client_managed' },
	water:       { mode: 'client_managed' },
	slt:         { mode: 'none' }
});

/**
 * Parse + validate a config payload. Throws ZodError on failure. Use this
 * server-side before inserting into agreement_billing_events.
 */
export function parseBillingConfig(raw) {
	return billingConfigSchema.parse(raw);
}

/** Same as above but returns null on invalid input instead of throwing. */
export function safeParseBillingConfig(raw) {
	const result = billingConfigSchema.safeParse(raw);
	return result.success ? result.data : null;
}
