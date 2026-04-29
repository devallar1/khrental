<script>
	import { enhance } from '$app/forms';
	import {
		ArrowLeft,
		ArrowRight,
		Check,
		CheckCircle2,
		XCircle,
		AlertCircle,
		Building2,
		Users,
		Receipt,
		Layers
	} from 'lucide-svelte';

	let { data, form } = $props();

	let step = $state(1);
	let submitting = $state(false);

	// Step 1 state
	let selectedPropertyIds = $state([]);
	let billingPeriod = $state(getCurrentMonth());
	let dueDate = $state(getDefaultDueDate());

	// Step 2 state
	let includeRent = $state(true);
	let notes = $state('');

	function getCurrentMonth() {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	}

	function getDefaultDueDate() {
		const d = new Date();
		d.setDate(d.getDate() + 14);
		return d.toISOString().split('T')[0];
	}

	function toggleProperty(id) {
		if (selectedPropertyIds.includes(id)) {
			selectedPropertyIds = selectedPropertyIds.filter((pid) => pid !== id);
		} else {
			selectedPropertyIds = [...selectedPropertyIds, id];
		}
	}

	function selectAll() {
		if (selectedPropertyIds.length === data.properties.length) {
			selectedPropertyIds = [];
		} else {
			selectedPropertyIds = data.properties.map((p) => p.id);
		}
	}

	// Agreements filtered by selected properties
	const selectedAgreements = $derived(
		data.agreements.filter((a) => selectedPropertyIds.includes(a.propertyid))
	);

	// Group agreements by property
	const agreementsByProperty = $derived(() => {
		const map = {};
		for (const propId of selectedPropertyIds) {
			const prop = data.properties.find((p) => p.id === propId);
			if (prop) {
				map[propId] = {
					property: prop,
					agreements: data.agreements.filter((a) => a.propertyid === propId)
				};
			}
		}
		return map;
	});

	const estimatedTotal = $derived(
		includeRent
			? selectedAgreements.reduce((sum, a) => sum + Number(a.rentamount || 0), 0)
			: 0
	);

	const canProceedToStep2 = $derived(
		selectedPropertyIds.length > 0 && billingPeriod && dueDate
	);

	const formatCurrency = (amount) => {
		const num = Number(amount);
		if (isNaN(num)) return '$0.00';
		return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	};

	const formatPeriod = (period) => {
		if (!period) return '';
		const [year, month] = period.split('-');
		const date = new Date(Number(year), Number(month) - 1);
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	};

	// Handle form result to advance to step 3
	$effect(() => {
		if (form?.success) {
			step = 3;
		}
	});

	const steps = [
		{ num: 1, label: 'Select Properties' },
		{ num: 2, label: 'Review & Configure' },
		{ num: 3, label: 'Results' }
	];

	const inputClass =
		'w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10';
	const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
</script>

<svelte:head>
	<title>Batch Generate Invoices - KH Rentals</title>
</svelte:head>

<div>
	<!-- Back button -->
	<div class="mb-6">
		<a
			href="/invoices"
			class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Invoices
		</a>
	</div>

	<div class="mb-8">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Batch Generate Invoices</h1>
		<p class="mt-1 text-sm text-slate-500">
			Generate invoices for multiple properties and rentees at once.
		</p>
	</div>

	<!-- Step Indicator -->
	<div class="mb-8">
		<div class="flex items-center justify-center gap-0">
			{#each steps as s, i}
				<div class="flex items-center">
					<div class="flex items-center gap-2">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors
								{step > s.num
								? 'bg-green-100 text-green-700'
								: step === s.num
									? 'bg-slate-900 text-white'
									: 'bg-slate-100 text-slate-400'}"
						>
							{#if step > s.num}
								<Check class="h-4 w-4" />
							{:else}
								{s.num}
							{/if}
						</div>
						<span
							class="hidden text-sm font-medium sm:block
								{step >= s.num ? 'text-slate-900' : 'text-slate-400'}"
						>
							{s.label}
						</span>
					</div>
					{#if i < steps.length - 1}
						<div
							class="mx-3 h-px w-12 sm:w-20
								{step > s.num ? 'bg-green-300' : 'bg-slate-200'}"
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	{#if form?.error && step !== 3}
		<div class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- Step 1: Select Properties & Period -->
	{#if step === 1}
		<div class="space-y-6">
			<!-- Period & Due Date -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-slate-900">Billing Period & Due Date</h2>
				<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="billingPeriod" class={labelClass}>Billing Period</label>
						<input
							type="month"
							id="billingPeriod"
							bind:value={billingPeriod}
							required
							class={inputClass}
						/>
					</div>
					<div>
						<label for="dueDate" class={labelClass}>Due Date</label>
						<input
							type="date"
							id="dueDate"
							bind:value={dueDate}
							required
							class={inputClass}
						/>
					</div>
				</div>
			</div>

			<!-- Properties Selection -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold text-slate-900">Select Properties</h2>
					{#if data.properties.length > 0}
						<button
							type="button"
							onclick={selectAll}
							class="text-sm font-medium text-slate-600 transition hover:text-slate-900"
						>
							{selectedPropertyIds.length === data.properties.length
								? 'Deselect All'
								: 'Select All'}
						</button>
					{/if}
				</div>

				{#if data.properties.length === 0}
					<div class="mt-4 rounded-xl bg-slate-50 p-6 text-center">
						<Building2 class="mx-auto h-8 w-8 text-slate-300" />
						<p class="mt-2 text-sm text-slate-500">No properties found.</p>
					</div>
				{:else}
					<div class="mt-4 space-y-2">
						{#each data.properties as property}
							{@const isSelected = selectedPropertyIds.includes(property.id)}
							{@const agreementCount = data.agreements.filter(
								(a) => a.propertyid === property.id
							).length}
							<button
								type="button"
								onclick={() => toggleProperty(property.id)}
								class="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition
									{isSelected
									? 'border-slate-900 bg-slate-50'
									: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}"
							>
								<div
									class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition
										{isSelected
										? 'border-slate-900 bg-slate-900'
										: 'border-slate-300 bg-white'}"
								>
									{#if isSelected}
										<Check class="h-3.5 w-3.5 text-white" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="font-medium text-slate-900">{property.name}</div>
									{#if property.address}
										<div class="text-sm text-slate-500">{property.address}</div>
									{/if}
								</div>
								<div class="shrink-0">
									{#if agreementCount > 0}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700"
										>
											<Users class="h-3 w-3" />
											{agreementCount} active
										</span>
									{:else}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500"
										>
											No agreements
										</span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Next Button -->
			<div class="flex items-center justify-end">
				<button
					type="button"
					disabled={!canProceedToStep2}
					onclick={() => (step = 2)}
					class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next
					<ArrowRight class="h-4 w-4" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Step 2: Review & Configure -->
	{#if step === 2}
		<form
			method="POST"
			action="?/generateBatch"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
			class="space-y-6"
		>
			<!-- Hidden fields -->
			<input type="hidden" name="propertyIds" value={JSON.stringify(selectedPropertyIds)} />
			<input type="hidden" name="billingPeriod" value={billingPeriod} />
			<input type="hidden" name="dueDate" value={dueDate} />
			<input type="hidden" name="includeRent" value={includeRent ? 'true' : 'false'} />

			<!-- Period Summary -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-slate-900">Batch Configuration</h2>
				<div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div class="rounded-xl bg-slate-50 p-3">
						<div class="text-xs font-medium uppercase tracking-wider text-slate-500">
							Period
						</div>
						<div class="mt-0.5 font-semibold text-slate-900">
							{formatPeriod(billingPeriod)}
						</div>
					</div>
					<div class="rounded-xl bg-slate-50 p-3">
						<div class="text-xs font-medium uppercase tracking-wider text-slate-500">
							Due Date
						</div>
						<div class="mt-0.5 font-semibold text-slate-900">{dueDate}</div>
					</div>
					<div class="rounded-xl bg-slate-50 p-3">
						<div class="text-xs font-medium uppercase tracking-wider text-slate-500">
							Properties
						</div>
						<div class="mt-0.5 font-semibold text-slate-900">
							{selectedPropertyIds.length} selected
						</div>
					</div>
				</div>
			</div>

			<!-- Include Rent Toggle -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<label class="flex cursor-pointer items-center justify-between">
					<div>
						<div class="font-medium text-slate-900">Include Rent Component</div>
						<div class="text-sm text-slate-500">
							Add the rent amount from each active agreement as a line item
						</div>
					</div>
					<div class="relative">
						<input
							type="checkbox"
							bind:checked={includeRent}
							class="peer sr-only"
						/>
						<div
							class="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-slate-900"
						></div>
						<div
							class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"
						></div>
					</div>
				</label>
			</div>

			<!-- Agreements by Property -->
			<div class="space-y-4">
				{#each selectedPropertyIds as propId}
					{@const property = data.properties.find((p) => p.id === propId)}
					{@const propAgreements = data.agreements.filter((a) => a.propertyid === propId)}
					<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
						<div class="flex items-center gap-2">
							<Building2 class="h-5 w-5 text-slate-400" />
							<h3 class="font-semibold text-slate-900">{property?.name}</h3>
						</div>
						{#if property?.address}
							<p class="mt-0.5 text-sm text-slate-500">{property.address}</p>
						{/if}

						{#if propAgreements.length === 0}
							<div
								class="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700"
							>
								<div class="flex items-center gap-2">
									<AlertCircle class="h-4 w-4 shrink-0" />
									No active agreements -- no invoices will be generated for this property.
								</div>
							</div>
						{:else}
							<div class="mt-4 space-y-2">
								{#each propAgreements as agreement}
									<div
										class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
									>
										<div class="flex items-center gap-3">
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600"
											>
												{(agreement.rentee_name || '?').charAt(0).toUpperCase()}
											</div>
											<div>
												<div class="text-sm font-medium text-slate-900">
													{agreement.rentee_name || agreement.rentee_email || 'Unknown'}
												</div>
												{#if agreement.rentee_email && agreement.rentee_name}
													<div class="text-xs text-slate-500">
														{agreement.rentee_email}
													</div>
												{/if}
											</div>
										</div>
										<div class="text-right">
											{#if includeRent}
												<div class="text-sm font-semibold text-slate-900">
													{formatCurrency(agreement.rentamount)}
												</div>
												<div class="text-xs text-slate-500">rent</div>
											{:else}
												<div class="text-xs text-slate-400">rent excluded</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Summary -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="text-lg font-semibold text-slate-900">Summary</h2>
				<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50"
						>
							<Building2 class="h-5 w-5 text-blue-600" />
						</div>
						<div>
							<div class="text-2xl font-bold text-slate-900">
								{selectedPropertyIds.length}
							</div>
							<div class="text-xs text-slate-500">Properties</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50"
						>
							<Users class="h-5 w-5 text-purple-600" />
						</div>
						<div>
							<div class="text-2xl font-bold text-slate-900">
								{selectedAgreements.length}
							</div>
							<div class="text-xs text-slate-500">Rentees</div>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50"
						>
							<Receipt class="h-5 w-5 text-green-600" />
						</div>
						<div>
							<div class="text-2xl font-bold text-slate-900">
								{formatCurrency(estimatedTotal)}
							</div>
							<div class="text-xs text-slate-500">Estimated Total</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Notes -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<label for="notes" class={labelClass}>Notes (optional)</label>
				<textarea
					id="notes"
					name="notes"
					bind:value={notes}
					rows="3"
					placeholder="Notes to include on all generated invoices..."
					class="{inputClass} resize-none"
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-between">
				<button
					type="button"
					onclick={() => (step = 1)}
					class="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
				>
					<ArrowLeft class="h-4 w-4" />
					Back
				</button>
				<button
					type="submit"
					disabled={submitting || selectedAgreements.length === 0}
					class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<Layers class="h-4 w-4" />
					{submitting ? 'Generating...' : `Generate ${selectedAgreements.length} Invoices`}
				</button>
			</div>
		</form>
	{/if}

	<!-- Step 3: Results -->
	{#if step === 3 && form?.success}
		<div class="space-y-6">
			<!-- Overall Result -->
			<div class="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
				<CheckCircle2 class="mx-auto h-12 w-12 text-green-600" />
				<h2 class="mt-3 text-xl font-bold text-slate-900">Batch Generation Complete</h2>
				<p class="mt-1 text-sm text-slate-600">
					{form.summary.created} invoice{form.summary.created !== 1 ? 's' : ''} created
					successfully.
				</p>
			</div>

			<!-- Summary Stats -->
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
					<div class="text-2xl font-bold text-slate-900">{form.summary.total}</div>
					<div class="text-xs text-slate-500">Total Processed</div>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
					<div class="text-2xl font-bold text-green-600">{form.summary.created}</div>
					<div class="text-xs text-slate-500">Created</div>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
					<div class="text-2xl font-bold text-amber-600">{form.summary.skipped}</div>
					<div class="text-xs text-slate-500">Skipped</div>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
					<div class="text-2xl font-bold text-slate-900">
						{formatCurrency(form.summary.totalAmount)}
					</div>
					<div class="text-xs text-slate-500">Total Amount</div>
				</div>
			</div>

			<!-- Individual Results -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h3 class="font-semibold text-slate-900">Invoice Details</h3>
				<div class="mt-4 space-y-2">
					{#each form.results as result}
						<div
							class="flex items-center justify-between rounded-xl px-4 py-3
								{result.status === 'success'
								? 'bg-green-50'
								: result.status === 'skipped'
									? 'bg-amber-50'
									: 'bg-red-50'}"
						>
							<div class="flex items-center gap-3">
								{#if result.status === 'success'}
									<CheckCircle2 class="h-5 w-5 shrink-0 text-green-600" />
								{:else if result.status === 'skipped'}
									<AlertCircle class="h-5 w-5 shrink-0 text-amber-600" />
								{:else}
									<XCircle class="h-5 w-5 shrink-0 text-red-600" />
								{/if}
								<div>
									<div class="text-sm font-medium text-slate-900">
										{result.renteeName}
									</div>
									<div class="text-xs text-slate-500">
										{result.propertyName}
										{#if result.reason}
											-- {result.reason}
										{/if}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-3">
								{#if result.status === 'success'}
									<span class="text-sm font-semibold text-slate-900">
										{formatCurrency(result.amount)}
									</span>
									<a
										href="/invoices/{result.invoiceId}"
										class="text-sm font-medium text-slate-600 underline transition hover:text-slate-900"
									>
										View
									</a>
								{:else}
									<span
										class="text-xs font-medium
											{result.status === 'skipped'
											? 'text-amber-600'
											: 'text-red-600'}"
									>
										{result.status}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-center gap-4">
				<a
					href="/invoices"
					class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
				>
					<Receipt class="h-4 w-4" />
					View All Invoices
				</a>
				<button
					type="button"
					onclick={() => {
						step = 1;
						selectedPropertyIds = [];
						billingPeriod = getCurrentMonth();
						dueDate = getDefaultDueDate();
						includeRent = true;
						notes = '';
						form = null;
					}}
					class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
				>
					<Layers class="h-4 w-4" />
					New Batch
				</button>
			</div>
		</div>
	{/if}
</div>
