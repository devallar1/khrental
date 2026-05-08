<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	let { form } = $props();

	let submitting = $state(false);

	const propertyTypes = ['apartment', 'house', 'commercial', 'land', 'condo', 'townhouse', 'other'];
	const statuses = ['available', 'occupied', 'maintenance'];
</script>

<svelte:head>
	<title>New Property - KH Rentals</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
	<!-- Header -->
	<header class="mb-6 flex items-start gap-3">
		<a
			href="/properties"
			class="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:text-foreground"
			aria-label="Back to properties"
		>
			<ArrowLeft class="h-4 w-4" />
		</a>
		<div>
			<p class="kicker">Property</p>
			<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">New property</h1>
		</div>
	</header>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
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
		<div class="space-y-5">
			<!-- Name -->
			<div>
				<label for="name" class="mb-1.5 block text-sm font-medium text-foreground">Name <span class="text-destructive">*</span></label>
				<input
					type="text"
					id="name"
					name="name"
					required
					value={form?.values?.name ?? ''}
					class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="e.g. Sunrise Apartments"
				/>
			</div>

			<!-- Address -->
			<div>
				<label for="address" class="mb-1.5 block text-sm font-medium text-foreground">Address</label>
				<textarea
					id="address"
					name="address"
					rows="2"
					value={form?.values?.address ?? ''}
					class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Full property address"
				></textarea>
			</div>

			<!-- Type & Status -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="propertytype" class="mb-1.5 block text-sm font-medium text-foreground">Property Type</label>
					<select
						id="propertytype"
						name="propertytype"
						class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="">Select type</option>
						{#each propertyTypes as type}
							<option value={type} selected={form?.values?.propertytype === type}>{type}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="status" class="mb-1.5 block text-sm font-medium text-foreground">Status</label>
					<select
						id="status"
						name="status"
						class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					>
						{#each statuses as s}
							<option value={s} selected={form?.values?.status === s || (!form?.values?.status && s === 'available')}>{s}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Description -->
			<div>
				<label for="description" class="mb-1.5 block text-sm font-medium text-foreground">Description</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					value={form?.values?.description ?? ''}
					class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Property description"
				></textarea>
			</div>

			<!-- Sqft & Year -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="squarefeet" class="mb-1.5 block text-sm font-medium text-foreground">Square Feet</label>
					<input
						type="number"
						id="squarefeet"
						name="squarefeet"
						step="0.01"
						value={form?.values?.squarefeet ?? ''}
						class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="e.g. 1200"
					/>
				</div>
				<div>
					<label for="yearbuilt" class="mb-1.5 block text-sm font-medium text-foreground">Year Built</label>
					<input
						type="number"
						id="yearbuilt"
						name="yearbuilt"
						value={form?.values?.yearbuilt ?? ''}
						class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="e.g. 2020"
					/>
				</div>
			</div>

			<!-- Amenities -->
			<div>
				<label for="amenities" class="mb-1.5 block text-sm font-medium text-foreground">Amenities</label>
				<input
					type="text"
					id="amenities"
					name="amenities"
					value={form?.values?.amenities ?? ''}
					class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="e.g. Pool, Gym, Parking (comma-separated)"
				/>
				<p class="mt-1 text-xs text-muted-foreground">Separate amenities with commas</p>
			</div>

			<!-- Rates -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label for="electricity_rate" class="mb-1.5 block text-sm font-medium text-foreground">Electricity Rate</label>
					<input
						type="number"
						id="electricity_rate"
						name="electricity_rate"
						step="0.01"
						value={form?.values?.electricity_rate ?? ''}
						class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Rate per kWh"
					/>
				</div>
				<div>
					<label for="water_rate" class="mb-1.5 block text-sm font-medium text-foreground">Water Rate</label>
					<input
						type="number"
						id="water_rate"
						name="water_rate"
						step="0.01"
						value={form?.values?.water_rate ?? ''}
						class="mt-1 w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Rate per unit"
					/>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-6">
			<a
				href="/properties"
				class="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting}
				class="rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary disabled:opacity-50"
			>
				{submitting ? 'Creating…' : 'Create property'}
			</button>
		</div>
	</form>
</div>
