<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	let { data, form } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>New agreement — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header>
		<a
			href="/agreements"
			class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to agreements
		</a>
		<div class="mt-3">
			<p class="kicker">Agreement</p>
			<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
				New agreement
			</h1>
		</div>
	</header>

	{#if form?.error}
		<div class="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
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
		class="rounded-2xl border border-border bg-card p-6 glow-primary"
	>
		<div class="grid gap-6 sm:grid-cols-2">
			<!-- Title -->
			<div class="sm:col-span-2">
				<label for="title" class="mb-1.5 block text-sm font-medium text-foreground">
					Title <span class="text-destructive">*</span>
				</label>
				<input
					type="text"
					id="title"
					name="title"
					value={form?.title || ''}
					required
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Agreement title"
				/>
			</div>

			<!-- Tenant -->
			<div>
				<label for="tenant_id" class="mb-1.5 block text-sm font-medium text-foreground">
					Tenant
				</label>
				<select
					id="tenant_id"
					name="tenant_id"
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">Select tenant…</option>
					{#each data.tenants as tenant}
						<option value={tenant.id} selected={form?.tenant_id === tenant.id}>
							{tenant.name || tenant.email}
						</option>
					{/each}
				</select>
			</div>

			<!-- Property -->
			<div>
				<label for="propertyid" class="mb-1.5 block text-sm font-medium text-foreground">
					Property
				</label>
				<select
					id="propertyid"
					name="propertyid"
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">Select property…</option>
					{#each data.properties as property}
						<option value={property.id} selected={form?.propertyid === property.id}>
							{property.name}
						</option>
					{/each}
				</select>
			</div>

			<!-- Template -->
			<div class="sm:col-span-2">
				<label for="templateid" class="mb-1.5 block text-sm font-medium text-foreground">
					Template
				</label>
				<select
					id="templateid"
					name="templateid"
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">Select template…</option>
					{#each data.templates as template}
						<option value={template.id} selected={form?.templateid === template.id}>
							{template.name} (v{template.version || '1.0'} / {template.language || 'English'})
						</option>
					{/each}
				</select>
			</div>

			<!-- Start Date -->
			<div>
				<label for="startdate" class="mb-1.5 block text-sm font-medium text-foreground">
					Start date
				</label>
				<input
					type="date"
					id="startdate"
					name="startdate"
					value={form?.startdate || ''}
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<!-- End Date -->
			<div>
				<label for="enddate" class="mb-1.5 block text-sm font-medium text-foreground">
					End date
				</label>
				<input
					type="date"
					id="enddate"
					name="enddate"
					value={form?.enddate || ''}
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<!-- Rent Amount -->
			<div>
				<label for="rentamount" class="mb-1.5 block text-sm font-medium text-foreground">
					Monthly rent
				</label>
				<input
					type="number"
					id="rentamount"
					name="rentamount"
					value={form?.rentamount || ''}
					step="0.01"
					min="0"
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="0.00"
				/>
			</div>

			<!-- Deposit Amount -->
			<div>
				<label for="depositamount" class="mb-1.5 block text-sm font-medium text-foreground">
					Security deposit
				</label>
				<input
					type="number"
					id="depositamount"
					name="depositamount"
					value={form?.depositamount || ''}
					step="0.01"
					min="0"
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="0.00"
				/>
			</div>

			<!-- Notes -->
			<div class="sm:col-span-2">
				<label for="notes" class="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
				<textarea
					id="notes"
					name="notes"
					rows="4"
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Optional notes…"
				>{form?.notes || ''}</textarea>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-6">
			<a
				href="/agreements"
				class="rounded-2xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting}
				class="rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary disabled:opacity-50"
			>
				{submitting ? 'Creating…' : 'Create agreement'}
			</button>
		</div>
	</form>
</div>
