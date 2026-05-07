<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft, Plus, Trash2, Receipt } from 'lucide-svelte';
	import { formatCurrency } from '$lib/format/money.js';

	let { data, form } = $props();

	let propertyid = $state(form?.propertyid || '');
	let renteeid = $state(form?.renteeid || '');
	let billingperiod = $state(form?.billingperiod || '');
	let duedate = $state(form?.duedate || '');
	let notes = $state(form?.notes || '');
	let submitting = $state(false);

	// Initialize components from form data or default
	const parseInitialComponents = () => {
		if (form?.components) {
			try {
				const parsed = JSON.parse(form.components);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			} catch {}
		}
		return [{ description: '', amount: '' }];
	};

	let components = $state(parseInitialComponents());

	const totalAmount = $derived(
		components.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
	);

	const addComponent = () => {
		components = [...components, { description: '', amount: '' }];
	};

	const removeComponent = (index) => {
		if (components.length <= 1) return;
		components = components.filter((_, i) => i !== index);
	};

	const inputClass =
		'w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring';
	const labelClass = 'block text-sm font-medium text-foreground mb-1.5';
</script>

<svelte:head>
	<title>Generate Invoice - KH Rentals</title>
</svelte:head>

<div>
	<!-- Back button -->
	<div class="mb-6">
		<a
			href="/invoices"
			class="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Invoices
		</a>
	</div>

	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground sm:text-3xl">Generate Invoice</h1>
		<p class="mt-1 text-sm text-muted-foreground">Create a new invoice for a rentee.</p>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-red-200 bg-destructive/10 p-4 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="space-y-6"
	>
		<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
			<h2 class="text-lg font-semibold text-foreground">Invoice Details</h2>
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="propertyid" class={labelClass}>Property</label>
					<select
						id="propertyid"
						name="propertyid"
						bind:value={propertyid}
						required
						class={inputClass}
					>
						<option value="">Select a property</option>
						{#each data.properties as property}
							<option value={property.id}>{property.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="renteeid" class={labelClass}>Rentee</label>
					<select
						id="renteeid"
						name="renteeid"
						bind:value={renteeid}
						required
						class={inputClass}
					>
						<option value="">Select a rentee</option>
						{#each data.rentees as rentee}
							<option value={rentee.id}>{rentee.name || rentee.email}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="billingperiod" class={labelClass}>Billing Period</label>
					<input
						type="text"
						id="billingperiod"
						name="billingperiod"
						bind:value={billingperiod}
						placeholder="e.g., March 2026"
						required
						class={inputClass}
					/>
				</div>

				<div>
					<label for="duedate" class={labelClass}>Due Date</label>
					<input
						type="date"
						id="duedate"
						name="duedate"
						bind:value={duedate}
						required
						class={inputClass}
					/>
				</div>
			</div>
		</div>

		<!-- Components / Line Items -->
		<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-foreground">Line Items</h2>
				<button
					type="button"
					onclick={addComponent}
					class="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-slate-200"
				>
					<Plus class="h-4 w-4" />
					Add Item
				</button>
			</div>

			<div class="mt-4 space-y-3">
				{#each components as comp, i}
					<div class="flex items-start gap-3">
						<div class="flex-1">
							{#if i === 0}
								<label for="comp-desc-{i}" class={labelClass}>Description</label>
							{/if}
							<input
								type="text"
								id="comp-desc-{i}"
								bind:value={comp.description}
								placeholder="e.g., Monthly Rent"
								class={inputClass}
							/>
						</div>
						<div class="w-36">
							{#if i === 0}
								<label for="comp-amt-{i}" class={labelClass}>Amount</label>
							{/if}
							<input
								type="number"
								id="comp-amt-{i}"
								bind:value={comp.amount}
								placeholder="0.00"
								step="0.01"
								min="0"
								class={inputClass}
							/>
						</div>
						<div class="pt-{i === 0 ? '7' : '0'}">
							<button
								type="button"
								onclick={() => removeComponent(i)}
								disabled={components.length <= 1}
								class="rounded-xl p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground {i === 0 ? 'mt-7' : ''}"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Total -->
			<div class="mt-4 flex items-center justify-end gap-4 border-t border-slate-100 pt-4">
				<span class="text-sm font-medium text-muted-foreground">Total:</span>
				<span class="text-xl font-bold text-foreground">{formatCurrency(totalAmount)}</span>
			</div>
		</div>

		<!-- Notes -->
		<div class="rounded-2xl border border-border bg-white p-6 shadow-sm">
			<label for="notes" class={labelClass}>Notes (optional)</label>
			<textarea
				id="notes"
				name="notes"
				bind:value={notes}
				rows="3"
				placeholder="Additional notes for this invoice..."
				class="{inputClass} resize-none"
			></textarea>
		</div>

		<!-- Hidden field for components JSON -->
		<input type="hidden" name="components" value={JSON.stringify(components)} />

		<!-- Submit -->
		<div class="flex items-center justify-end gap-3">
			<a
				href="/invoices"
				class="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:text-foreground"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting}
				class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
			>
				<Receipt class="h-4 w-4" />
				{submitting ? 'Creating...' : 'Generate Invoice'}
			</button>
		</div>
	</form>
</div>
