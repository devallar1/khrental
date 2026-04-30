<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft, ArrowRight, Save, X, Wallet, Plus } from 'lucide-svelte';
	import { defaultBillingConfig } from '$lib/billing/config.js';

	let { realm = [], bankProfiles = [], onCancel, onSaved } = $props();

	// All form state lives here; each step reads/writes slices of it.
	let identity = $state({
		name: '',
		phone: '',
		email: '',
		national_id: '',
		permanent_address: '',
		notes: ''
	});
	let tenancy = $state({
		property_id: '',
		unit_id: '',
		start_date: new Date().toISOString().slice(0, 10),
		end_date: '',
		rent_amount: '',
		deposit_amount: ''
	});
	let billing = $state(defaultBillingConfig());
	let banking = $state({ bank_profile_id: '' });

	let step = $state(1);
	let submitting = $state(false);
	let actionError = $state(null);

	const STEP_LABELS = ['Identity', 'Tenancy', 'Billing', 'Banking'];

	const selectedProperty = $derived(
		realm.find((p) => p.id === tenancy.property_id) || null
	);
	const availableUnits = $derived(selectedProperty?.units || []);
	const filteredBankProfiles = $derived(
		selectedProperty
			? bankProfiles.filter((bp) => bp.tenant_id === selectedProperty.tenant_id)
			: []
	);

	// Reset unit + bank profile when property changes
	let lastPropertyId = $state('');
	$effect(() => {
		if (tenancy.property_id !== lastPropertyId) {
			lastPropertyId = tenancy.property_id;
			tenancy.unit_id = '';
			banking.bank_profile_id = '';
		}
	});

	// Per-utility billing mode UI: switching mode wipes the mode-specific
	// fields so we don't persist stale numbers under the new mode.
	function setElecMode(mode) {
		if (mode === 'fixed')           billing.electricity = { mode, fixed_lkr: 0 };
		else if (mode === 'unit_based') billing.electricity = { mode, rate: 0, initial_reading: 0 };
		else if (mode === 'solar_offset') billing.electricity = { mode, rate: 22, offset_units: 500, initial_reading: 0 };
		else                            billing.electricity = { mode };
	}
	function setWaterMode(mode) {
		if (mode === 'fixed')           billing.water = { mode, fixed_lkr: 0 };
		else if (mode === 'unit_based') billing.water = { mode, rate: 0, initial_reading: 0 };
		else                            billing.water = { mode };
	}
	function setSltMode(mode) {
		if (mode === 'fixed')           billing.slt = { mode, fixed_lkr: 0 };
		else                            billing.slt = { mode };
	}
	function setRentMode(mode) {
		billing.rent = { mode };
	}

	function canAdvanceFrom(s) {
		if (s === 1) return identity.name.trim().length > 0;
		if (s === 2) return tenancy.property_id && tenancy.unit_id && tenancy.start_date;
		if (s === 3) return true; // defaults are valid
		if (s === 4) return true;
		return false;
	}

	function next() {
		if (!canAdvanceFrom(step)) return;
		actionError = null;
		step = Math.min(4, step + 1);
	}
	function prev() {
		actionError = null;
		step = Math.max(1, step - 1);
	}

	function onSubmit() {
		submitting = true;
		actionError = null;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'failure') {
				actionError = result.data?.error || 'Failed to create tenant';
				await update({ reset: false });
				return;
			}
			await update({ reset: false });
			onSaved?.();
		};
	}

	const billingJson = $derived(JSON.stringify(billing));
</script>

<div class="wizard">
	<header class="wizard-header">
		<div class="wizard-title">
			<span class="wizard-pill">New tenant</span>
		</div>
		<button type="button" class="wizard-close" onclick={() => onCancel?.()} aria-label="Close">
			<X class="h-4 w-4" />
		</button>
	</header>

	<!-- Step indicator -->
	<ol class="step-strip">
		{#each STEP_LABELS as label, i}
			{@const n = i + 1}
			<li class="step" class:active={step === n} class:done={step > n}>
				<span class="step-num">{n}</span>
				<span class="step-label">{label}</span>
			</li>
		{/each}
	</ol>

	{#if actionError}
		<div class="wizard-error">{actionError}</div>
	{/if}

	<form
		method="POST"
		action="?/createTenantWithAgreement"
		use:enhance={onSubmit}
		class="wizard-body"
	>
		<!-- Hidden carriers; visible inputs in each step bind directly to the
		     state objects, then we mirror into hidden inputs at the end. -->
		<input type="hidden" name="name" value={identity.name} />
		<input type="hidden" name="phone" value={identity.phone} />
		<input type="hidden" name="email" value={identity.email} />
		<input type="hidden" name="national_id" value={identity.national_id} />
		<input type="hidden" name="permanent_address" value={identity.permanent_address} />
		<input type="hidden" name="notes" value={identity.notes} />
		<input type="hidden" name="property_id" value={tenancy.property_id} />
		<input type="hidden" name="unit_id" value={tenancy.unit_id} />
		<input type="hidden" name="start_date" value={tenancy.start_date} />
		<input type="hidden" name="end_date" value={tenancy.end_date} />
		<input type="hidden" name="rent_amount" value={tenancy.rent_amount} />
		<input type="hidden" name="deposit_amount" value={tenancy.deposit_amount} />
		<input type="hidden" name="bank_profile_id" value={banking.bank_profile_id} />
		<input type="hidden" name="billing_config" value={billingJson} />

		{#if step === 1}
			<section class="step-pane">
				<h2 class="step-heading">Identity</h2>
				<div class="grid">
					<label class="field">
						<span>Full name *</span>
						<input type="text" bind:value={identity.name} placeholder="Aruna Wickramasinghe" required />
					</label>
					<label class="field">
						<span>Phone</span>
						<input type="tel" bind:value={identity.phone} placeholder="+94 7…" />
					</label>
					<label class="field">
						<span>Email</span>
						<input type="email" bind:value={identity.email} placeholder="name@example.com" />
					</label>
					<label class="field">
						<span>NIC / Passport</span>
						<input type="text" bind:value={identity.national_id} />
					</label>
					<label class="field span2">
						<span>Permanent address</span>
						<textarea rows="2" bind:value={identity.permanent_address}></textarea>
					</label>
					<label class="field span2">
						<span>Notes</span>
						<textarea rows="2" bind:value={identity.notes}></textarea>
					</label>
				</div>
			</section>
		{/if}

		{#if step === 2}
			<section class="step-pane">
				<h2 class="step-heading">Tenancy</h2>
				<div class="grid">
					<label class="field span2">
						<span>Property *</span>
						<select bind:value={tenancy.property_id} required>
							<option value="">— select property —</option>
							{#each realm as p}
								<option value={p.id}>{p.tenant_name} · {p.name}</option>
							{/each}
						</select>
					</label>
					<label class="field span2">
						<span>Unit *</span>
						<select bind:value={tenancy.unit_id} disabled={!selectedProperty} required>
							<option value="">— select unit —</option>
							{#each availableUnits as u}
								<option value={u.id}>
									{u.unitnumber}{u.rentee_name ? ` · occupied by ${u.rentee_name}` : ' · vacant'}
								</option>
							{/each}
						</select>
					</label>
					<label class="field">
						<span>Start date *</span>
						<input type="date" bind:value={tenancy.start_date} required />
					</label>
					<label class="field">
						<span>End date</span>
						<input type="date" bind:value={tenancy.end_date} />
					</label>
					<label class="field">
						<span>Rent (LKR / month)</span>
						<input type="number" inputmode="decimal" step="0.01" min="0" bind:value={tenancy.rent_amount} placeholder="20000" />
					</label>
					<label class="field">
						<span>Deposit (LKR)</span>
						<input type="number" inputmode="decimal" step="0.01" min="0" bind:value={tenancy.deposit_amount} placeholder="40000" />
					</label>
				</div>
			</section>
		{/if}

		{#if step === 3}
			<section class="step-pane">
				<h2 class="step-heading">Billing modes</h2>
				<p class="step-hint">
					Each utility can be fixed, metered, or paid directly by the tenant. Pick what applies and fill in the parameters; everything else stays untracked.
				</p>

				<!-- Rent -->
				<div class="util-block">
					<header class="util-head">
						<span class="util-title">Rent</span>
						<select value={billing.rent.mode} onchange={(e) => setRentMode(e.currentTarget.value)}>
							<option value="fixed">Fixed (uses rent above)</option>
							<option value="client_managed">Tenant-managed</option>
						</select>
					</header>
				</div>

				<!-- Electricity -->
				<div class="util-block">
					<header class="util-head">
						<span class="util-title">Electricity</span>
						<select value={billing.electricity.mode} onchange={(e) => setElecMode(e.currentTarget.value)}>
							<option value="client_managed">Tenant-managed</option>
							<option value="fixed">Fixed monthly</option>
							<option value="unit_based">Metered (units × rate)</option>
							<option value="solar_offset">Solar offset (KIT-style)</option>
						</select>
					</header>
					{#if billing.electricity.mode === 'fixed'}
						<div class="util-fields">
							<label class="field"><span>Monthly LKR</span><input type="number" step="0.01" min="0" bind:value={billing.electricity.fixed_lkr} /></label>
						</div>
					{:else if billing.electricity.mode === 'unit_based'}
						<div class="util-fields">
							<label class="field"><span>LKR / unit</span><input type="number" step="0.01" min="0" bind:value={billing.electricity.rate} /></label>
							<label class="field"><span>Move-in meter reading</span><input type="number" step="0.1" min="0" bind:value={billing.electricity.initial_reading} /></label>
						</div>
					{:else if billing.electricity.mode === 'solar_offset'}
						<div class="util-fields">
							<label class="field"><span>LKR / unit</span><input type="number" step="0.01" min="0" bind:value={billing.electricity.rate} /></label>
							<label class="field"><span>Free unit allowance</span><input type="number" step="1" min="0" bind:value={billing.electricity.offset_units} /></label>
							<label class="field"><span>Move-in meter reading</span><input type="number" step="0.1" min="0" bind:value={billing.electricity.initial_reading} /></label>
						</div>
					{/if}
				</div>

				<!-- Water -->
				<div class="util-block">
					<header class="util-head">
						<span class="util-title">Water</span>
						<select value={billing.water.mode} onchange={(e) => setWaterMode(e.currentTarget.value)}>
							<option value="client_managed">Tenant-managed</option>
							<option value="fixed">Fixed monthly</option>
							<option value="unit_based">Metered (units × rate)</option>
						</select>
					</header>
					{#if billing.water.mode === 'fixed'}
						<div class="util-fields">
							<label class="field"><span>Monthly LKR</span><input type="number" step="0.01" min="0" bind:value={billing.water.fixed_lkr} /></label>
						</div>
					{:else if billing.water.mode === 'unit_based'}
						<div class="util-fields">
							<label class="field"><span>LKR / unit</span><input type="number" step="0.01" min="0" bind:value={billing.water.rate} /></label>
							<label class="field"><span>Move-in meter reading</span><input type="number" step="0.1" min="0" bind:value={billing.water.initial_reading} /></label>
						</div>
					{/if}
				</div>

				<!-- SLT -->
				<div class="util-block">
					<header class="util-head">
						<span class="util-title">Internet (SLT)</span>
						<select value={billing.slt.mode} onchange={(e) => setSltMode(e.currentTarget.value)}>
							<option value="none">Not applicable</option>
							<option value="passthrough">Pass-through (enter monthly invoice value)</option>
							<option value="fixed">Fixed monthly</option>
							<option value="client_managed">Tenant-managed</option>
						</select>
					</header>
					{#if billing.slt.mode === 'fixed'}
						<div class="util-fields">
							<label class="field"><span>Monthly LKR</span><input type="number" step="0.01" min="0" bind:value={billing.slt.fixed_lkr} /></label>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		{#if step === 4}
			<section class="step-pane">
				<h2 class="step-heading">Banking</h2>
				<p class="step-hint">
					Pick which bank account the invoice is drawn against. Setting one here also sets it on the unit (so future tenants on the same unit inherit it). Leave blank to skip — invoices won't show banking details.
				</p>

				{#if filteredBankProfiles.length === 0}
					<div class="bank-empty">
						No bank profiles for this org yet.
						<a href="/properties/bank-profiles" target="_blank" rel="noopener">
							Create one ↗
						</a>
					</div>
				{:else}
					<div class="bank-list">
						<label class="bank-row">
							<input type="radio" bind:group={banking.bank_profile_id} value="" />
							<span class="bank-row-name">— skip banking for now —</span>
						</label>
						{#each filteredBankProfiles as bp}
							<label class="bank-row" class:checked={banking.bank_profile_id === bp.id}>
								<input type="radio" bind:group={banking.bank_profile_id} value={bp.id} />
								<div class="bank-row-info">
									<div class="bank-row-name">
										<Wallet class="h-3.5 w-3.5" />
										{bp.label}
									</div>
									<div class="bank-row-meta">
										{bp.account_holder_name} · <span class="mono">{bp.account_number}</span> · {bp.bank_name}{bp.branch ? ` · ${bp.branch}` : ''}
									</div>
								</div>
							</label>
						{/each}
					</div>
					<a href="/properties/bank-profiles" target="_blank" rel="noopener" class="bank-link">
						<Plus class="h-3.5 w-3.5" /> Add a new profile
					</a>
				{/if}
			</section>
		{/if}

		<footer class="wizard-footer">
			<button type="button" class="ghost" onclick={prev} disabled={step === 1 || submitting}>
				<ArrowLeft class="h-4 w-4" /> Back
			</button>
			{#if step < 4}
				<button type="button" class="primary" onclick={next} disabled={!canAdvanceFrom(step)}>
					Next <ArrowRight class="h-4 w-4" />
				</button>
			{:else}
				<button type="submit" class="primary" disabled={submitting}>
					<Save class="h-4 w-4" /> {submitting ? 'Saving…' : 'Create tenant'}
				</button>
			{/if}
		</footer>
	</form>
</div>

<style>
	.wizard {
		position: absolute;
		inset: 0;
		background: oklch(0.18 0.025 220 / 0.96);
		backdrop-filter: blur(10px);
		display: flex;
		flex-direction: column;
		color: oklch(0.97 0.012 200);
	}

	.wizard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid oklch(0.275 0.028 220);
	}
	.wizard-pill {
		display: inline-block;
		padding: 3px 10px;
		background: oklch(0.86 0.13 195 / 0.15);
		color: oklch(0.86 0.13 195);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border-radius: 4px;
	}
	.wizard-close {
		display: inline-flex;
		width: 28px;
		height: 28px;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: oklch(0.78 0.018 200);
		cursor: pointer;
	}
	.wizard-close:hover {
		background: oklch(0.215 0.028 220);
		color: oklch(0.97 0.012 200);
	}

	.step-strip {
		display: flex;
		gap: 8px;
		padding: 12px 14px 8px;
		list-style: none;
		margin: 0;
	}
	.step {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 8px;
		border: 1px solid oklch(0.32 0.030 220);
		border-radius: 8px;
		background: oklch(0.215 0.028 220 / 0.5);
		font-size: 11px;
	}
	.step.active {
		border-color: oklch(0.86 0.13 195 / 0.6);
		background: oklch(0.86 0.13 195 / 0.10);
	}
	.step.done {
		border-color: oklch(0.78 0.13 165 / 0.4);
		background: oklch(0.78 0.13 165 / 0.06);
	}
	.step-num {
		font-weight: 700;
		font-size: 10px;
		color: oklch(0.58 0.020 200);
	}
	.step.active .step-num,
	.step.done .step-num {
		color: oklch(0.86 0.13 195);
	}
	.step-label {
		font-weight: 500;
		color: oklch(0.97 0.012 200);
	}

	.wizard-error {
		margin: 8px 14px 0;
		padding: 7px 10px;
		background: oklch(0.66 0.18 25 / 0.15);
		border: 1px solid oklch(0.66 0.18 25 / 0.4);
		border-radius: 8px;
		color: oklch(0.85 0.10 25);
		font-size: 12px;
	}

	.wizard-body {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
	}
	.step-pane {
		flex: 1;
	}
	.step-heading {
		margin: 0 0 4px;
		font-size: 14px;
		font-weight: 600;
		color: oklch(0.97 0.012 200);
	}
	.step-hint {
		margin: 0 0 16px;
		font-size: 12px;
		color: oklch(0.58 0.020 200);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.field.span2 {
		grid-column: 1 / -1;
	}
	.field > span {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: oklch(0.58 0.020 200);
	}
	.field input,
	.field select,
	.field textarea {
		padding: 7px 10px;
		background: oklch(0.215 0.028 220);
		border: 1px solid oklch(0.32 0.030 220);
		border-radius: 8px;
		color: oklch(0.97 0.012 200);
		font-size: 12.5px;
		font-family: inherit;
		outline: none;
	}
	.field input:focus,
	.field select:focus,
	.field textarea:focus {
		border-color: oklch(0.86 0.13 195 / 0.6);
	}
	.field input:disabled,
	.field select:disabled {
		opacity: 0.5;
	}

	.util-block {
		margin-top: 12px;
		padding: 10px 12px;
		background: oklch(0.215 0.028 220 / 0.5);
		border: 1px solid oklch(0.32 0.030 220);
		border-radius: 10px;
	}
	.util-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.util-title {
		font-size: 12.5px;
		font-weight: 600;
		color: oklch(0.97 0.012 200);
	}
	.util-head select {
		padding: 5px 8px;
		background: oklch(0.18 0.025 220);
		border: 1px solid oklch(0.32 0.030 220);
		border-radius: 6px;
		color: oklch(0.97 0.012 200);
		font-size: 12px;
		font-family: inherit;
	}
	.util-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 10px;
	}

	.bank-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.bank-row {
		display: flex;
		gap: 10px;
		padding: 10px 12px;
		background: oklch(0.215 0.028 220 / 0.5);
		border: 1px solid oklch(0.32 0.030 220);
		border-radius: 8px;
		cursor: pointer;
	}
	.bank-row:hover {
		background: oklch(0.255 0.030 220 / 0.6);
	}
	.bank-row.checked {
		border-color: oklch(0.86 0.13 195 / 0.6);
		background: oklch(0.86 0.13 195 / 0.08);
	}
	.bank-row-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
	}
	.bank-row-name {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: oklch(0.97 0.012 200);
	}
	.bank-row-meta {
		font-size: 11px;
		color: oklch(0.58 0.020 200);
	}
	.bank-row-meta .mono {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}
	.bank-empty {
		padding: 16px;
		background: oklch(0.215 0.028 220 / 0.5);
		border: 1px dashed oklch(0.32 0.030 220);
		border-radius: 8px;
		font-size: 12.5px;
		color: oklch(0.78 0.018 200);
		text-align: center;
	}
	.bank-empty a {
		color: oklch(0.86 0.13 195);
		text-decoration: none;
		font-weight: 600;
	}
	.bank-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 8px;
		font-size: 12px;
		color: oklch(0.86 0.13 195);
		text-decoration: none;
		font-weight: 500;
	}
	.bank-link:hover {
		text-decoration: underline;
	}

	.wizard-footer {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		padding-top: 12px;
		margin-top: 12px;
		border-top: 1px solid oklch(0.275 0.028 220);
	}
	.wizard-footer button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 600;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
	}
	.wizard-footer .ghost {
		background: transparent;
		color: oklch(0.78 0.018 200);
		border: 1px solid oklch(0.32 0.030 220);
	}
	.wizard-footer .ghost:hover:not(:disabled) {
		background: oklch(0.215 0.028 220);
		color: oklch(0.97 0.012 200);
	}
	.wizard-footer .primary {
		background: oklch(0.86 0.13 195);
		color: oklch(0.16 0.025 220);
		border: 1px solid oklch(0.86 0.13 195);
	}
	.wizard-footer .primary:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	.wizard-footer button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
