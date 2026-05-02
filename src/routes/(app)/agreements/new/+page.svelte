<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	let { data, form } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>New Agreement - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6">
		<a
			href="/agreements"
			class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Agreements
		</a>
		<h1 class="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">New Agreement</h1>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
		class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
	>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<!-- Title -->
			<div class="sm:col-span-2">
				<label for="title" class="block text-sm font-medium text-slate-700">Title <span class="text-red-500">*</span></label>
				<input
					type="text"
					id="title"
					name="title"
					value={form?.title || ''}
					required
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="Agreement title"
				/>
			</div>

			<!-- Tenant -->
			<div>
				<label for="tenant_id" class="block text-sm font-medium text-slate-700">Tenant</label>
				<select
					id="tenant_id"
					name="tenant_id"
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
				>
					<option value="">Select tenant...</option>
					{#each data.tenants as tenant}
						<option value={tenant.id} selected={form?.tenant_id === tenant.id}>
							{tenant.name || tenant.email}
						</option>
					{/each}
				</select>
			</div>

			<!-- Property -->
			<div>
				<label for="propertyid" class="block text-sm font-medium text-slate-700">Property</label>
				<select
					id="propertyid"
					name="propertyid"
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
				>
					<option value="">Select property...</option>
					{#each data.properties as property}
						<option value={property.id} selected={form?.propertyid === property.id}>
							{property.name}
						</option>
					{/each}
				</select>
			</div>

			<!-- Template -->
			<div class="sm:col-span-2">
				<label for="templateid" class="block text-sm font-medium text-slate-700">Template</label>
				<select
					id="templateid"
					name="templateid"
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
				>
					<option value="">Select template...</option>
					{#each data.templates as template}
						<option value={template.id} selected={form?.templateid === template.id}>
							{template.name} (v{template.version || '1.0'} / {template.language || 'English'})
						</option>
					{/each}
				</select>
			</div>

			<!-- Start Date -->
			<div>
				<label for="startdate" class="block text-sm font-medium text-slate-700">Start Date</label>
				<input
					type="date"
					id="startdate"
					name="startdate"
					value={form?.startdate || ''}
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
				/>
			</div>

			<!-- End Date -->
			<div>
				<label for="enddate" class="block text-sm font-medium text-slate-700">End Date</label>
				<input
					type="date"
					id="enddate"
					name="enddate"
					value={form?.enddate || ''}
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
				/>
			</div>

			<!-- Rent Amount -->
			<div>
				<label for="rentamount" class="block text-sm font-medium text-slate-700">Monthly Rent</label>
				<input
					type="number"
					id="rentamount"
					name="rentamount"
					value={form?.rentamount || ''}
					step="0.01"
					min="0"
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="0.00"
				/>
			</div>

			<!-- Deposit Amount -->
			<div>
				<label for="depositamount" class="block text-sm font-medium text-slate-700">Security Deposit</label>
				<input
					type="number"
					id="depositamount"
					name="depositamount"
					value={form?.depositamount || ''}
					step="0.01"
					min="0"
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="0.00"
				/>
			</div>

			<!-- Notes -->
			<div class="sm:col-span-2">
				<label for="notes" class="block text-sm font-medium text-slate-700">Notes</label>
				<textarea
					id="notes"
					name="notes"
					rows="4"
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="Optional notes..."
				>{form?.notes || ''}</textarea>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
			<a
				href="/agreements"
				class="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting}
				class="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
			>
				{submitting ? 'Creating...' : 'Create Agreement'}
			</button>
		</div>
	</form>
</div>
