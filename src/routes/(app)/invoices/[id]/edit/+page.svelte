<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft, Save, Plus, Trash2, AlertTriangle, User, Building2, Landmark } from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data, form } = $props();

	const invoice = $derived(data.invoice);

	let billingPeriod = $state(invoice.billingperiod || '');
	let dueDate = $state(invoice.duedate ? String(invoice.duedate).slice(0, 10) : '');
	let currency = $state(invoice.currency || 'LKR');
	let notes = $state(invoice.notes || '');
	let lines = $state(
		(data.components || []).map((c) => ({
			description: c.description || c.name || c.label || '',
			amount: Number(c.amount) || 0
		}))
	);

	function addLine() {
		lines = [...lines, { description: '', amount: 0 }];
	}
	function removeLine(idx) {
		lines = lines.filter((_, i) => i !== idx);
	}

	const cleanedLines = $derived(
		lines
			.map((l) => ({
				description: String(l.description || '').trim(),
				amount: Number(l.amount) || 0
			}))
			.filter((l) => l.description && l.amount !== 0)
	);
	const total = $derived(cleanedLines.reduce((s, l) => s + l.amount, 0));

	let submitting = $state(false);
	function onSubmit() {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}
</script>

<svelte:head>
	<title>Edit invoice — {invoice.tenant_name || ''}</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-6">
		<a href="/invoices/{invoice.id}" class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
			<ArrowLeft class="h-4 w-4" />
			Back to invoice
		</a>
		<div class="mt-3">
			<p class="kicker">Invoice</p>
			<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Edit draft</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{invoice.tenant_name || '—'}
				{#if invoice.property_name}
					· {invoice.property_name}{#if invoice.unit_unitnumber}, Unit {invoice.unit_unitnumber}{/if}
				{/if}
			</p>
		</div>
	</div>

	{#if form?.error}
		<div class="mb-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
			<AlertTriangle class="h-4 w-4 flex-shrink-0" />
			<span>{form.error}</span>
		</div>
	{/if}

	<form method="POST" action="?/saveEdit" use:enhance={onSubmit}>
		<input type="hidden" name="components" value={JSON.stringify(cleanedLines)} />
		<input type="hidden" name="currency" value={currency} />

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div class="lg:col-span-2 space-y-6">
				<!-- Period -->
				<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<h2 class="font-display text-base font-semibold">Period</h2>
					<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
						<label class="block">
							<span class="kicker">Billing period</span>
							<input type="text" name="billingPeriod" bind:value={billingPeriod} class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
						</label>
						<label class="block">
							<span class="kicker">Due date</span>
							<input type="date" name="dueDate" bind:value={dueDate} class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring" />
						</label>
					</div>
				</div>

				<!-- Line items -->
				<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<div class="flex items-center justify-between">
						<h2 class="font-display text-base font-semibold">Line items</h2>
						<button
							type="button"
							onclick={addLine}
							class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
						>
							<Plus class="h-3.5 w-3.5" />
							Add row
						</button>
					</div>

					{#if lines.length === 0}
						<p class="mt-4 text-sm text-muted-foreground">No line items. Click "Add row" to add one.</p>
					{:else}
						<div class="mt-4 space-y-2">
							{#each lines as l, idx (idx)}
								<div class="grid grid-cols-[2fr_1fr_auto] gap-2">
									<input
										type="text"
										bind:value={l.description}
										placeholder="Description"
										class="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
									/>
									<input
										type="number"
										bind:value={l.amount}
										step="0.01"
										placeholder="0.00"
										class="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
									/>
									<button
										type="button"
										onclick={() => removeLine(idx)}
										class="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
										title="Remove row"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Notes -->
				<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<h2 class="font-display text-base font-semibold">Notes</h2>
					<textarea
						name="notes"
						bind:value={notes}
						rows="3"
						class="mt-3 w-full rounded-2xl border border-input bg-background px-3.5 py-2 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					></textarea>
				</div>
			</div>

			<!-- Sidebar -->
			<div class="space-y-6">
				<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<p class="kicker">Bill to</p>
					<div class="mt-2 flex items-start gap-2">
						<User class="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div>
							<p class="text-sm font-medium">{invoice.tenant_name || '—'}</p>
							{#if invoice.tenant_email}<p class="text-xs text-muted-foreground">{invoice.tenant_email}</p>{/if}
						</div>
					</div>
					{#if invoice.property_name}
						<div class="mt-3 flex items-start gap-2">
							<Building2 class="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium">{invoice.property_name}</p>
								{#if invoice.unit_unitnumber}<p class="text-xs text-muted-foreground">Unit {invoice.unit_unitnumber}</p>{/if}
							</div>
						</div>
					{/if}
				</div>

				{#if invoice.bank_label}
					<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
						<p class="kicker">Bank routing</p>
						<div class="mt-2 flex items-start gap-2">
							<Landmark class="mt-0.5 h-4 w-4 text-muted-foreground" />
							<div>
								<p class="text-sm font-medium">{invoice.bank_label}</p>
								{#if invoice.bank_name}<p class="text-xs text-muted-foreground">{invoice.bank_name}{#if invoice.branch} — {invoice.branch}{/if}</p>{/if}
							</div>
						</div>
					</div>
				{/if}

				<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
					<p class="kicker">Total</p>
					<p class="mt-2 font-mono text-3xl font-bold tracking-tight">{formatCurrency(total, currency)}</p>
					<p class="mt-1 text-xs text-muted-foreground">{cleanedLines.length} line item{cleanedLines.length === 1 ? '' : 's'}</p>
				</div>

				<div class="space-y-2">
					<button
						type="submit"
						disabled={submitting || cleanedLines.length === 0}
						class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Save class="h-4 w-4" />
						{submitting ? 'Saving…' : 'Save changes'}
					</button>
					<a
						href="/invoices/{invoice.id}"
						class="block w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-center text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
					>
						Cancel
					</a>
				</div>
			</div>
		</div>
	</form>
</div>
