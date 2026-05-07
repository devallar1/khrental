<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	let { data, form } = $props();

	let loading = $state(false);

	const tenant = $derived(data.tenant);
</script>

<svelte:head>
	<title>Edit {tenant.name || 'Tenant'} — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<header class="flex items-start gap-3">
		<a
			href="/tenants/{tenant.id}"
			class="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:text-foreground"
			aria-label="Back to tenant"
		>
			<ArrowLeft class="h-4 w-4" />
		</a>
		<div>
			<p class="kicker">Tenant</p>
			<h1 class="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
				Edit tenant
			</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">{tenant.name}</p>
		</div>
	</header>

	<!-- Form -->
	<div class="rounded-2xl border border-border bg-card p-6 glow-primary">
		{#if form?.error}
			<div class="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<div class="grid gap-5 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label for="name" class="mb-1.5 block text-sm font-medium text-foreground">
						Name <span class="text-destructive">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						value={form?.name ?? tenant.name ?? ''}
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Full name"
					/>
				</div>

				<div>
					<label for="email" class="mb-1.5 block text-sm font-medium text-foreground">Email</label>
					<input
						type="email"
						id="email"
						name="email"
						value={form?.email ?? tenant.email ?? ''}
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="email@example.com"
					/>
				</div>

				<div>
					<label for="phone" class="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
					<input
						type="tel"
						id="phone"
						name="phone"
						value={form?.phone ?? data.phone ?? ''}
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="+94 77 555 0123"
					/>
				</div>

				<div>
					<label for="national_id" class="mb-1.5 block text-sm font-medium text-foreground">
						National ID
					</label>
					<input
						type="text"
						id="national_id"
						name="national_id"
						value={form?.national_id ?? tenant.national_id ?? ''}
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="ID number"
					/>
				</div>

				<div>
					<label for="permanent_address" class="mb-1.5 block text-sm font-medium text-foreground">
						Permanent address
					</label>
					<input
						type="text"
						id="permanent_address"
						name="permanent_address"
						value={form?.permanent_address ?? tenant.permanent_address ?? ''}
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Home address"
					/>
				</div>

				<div class="sm:col-span-2">
					<label for="notes" class="mb-1.5 block text-sm font-medium text-foreground">Notes</label>
					<textarea
						id="notes"
						name="notes"
						rows="3"
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Additional notes…"
					>{form?.notes ?? tenant.notes ?? ''}</textarea>
				</div>

				<div class="sm:col-span-2">
					<label class="inline-flex cursor-pointer items-center gap-2.5">
						<input
							type="checkbox"
							name="active"
							checked={form?.active ?? tenant.active ?? true}
							class="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
						/>
						<span class="text-sm font-medium text-foreground">Active</span>
					</label>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-end gap-3">
				<a
					href="/tenants/{tenant.id}"
					class="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={loading}
					class="rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary disabled:opacity-50"
				>
					{loading ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</form>
	</div>
</div>
