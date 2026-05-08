<script>
	import { ShieldCheck, Plus, Users, Building2 } from 'lucide-svelte';

	let { data, form } = $props();

	const orgs = $derived(data.tenants || []);
	const memberships = $derived(data.memberships || []);

	let showForm = $state(false);

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	// Reset form on success
	$effect(() => {
		if (form?.success) showForm = false;
	});
</script>

<svelte:head>
	<title>Organizations - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground sm:text-3xl">Organizations</h1>
			<p class="mt-1 text-sm text-muted-foreground">Manage all orgs and memberships</p>
		</div>
		<button
			onclick={() => (showForm = !showForm)}
			class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
		>
			<Plus class="h-4 w-4" />
			New Organization
		</button>
	</div>

	<!-- Create form -->
	{#if showForm}
		<div class="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
			<h2 class="text-lg font-semibold text-foreground mb-4">Create New Organization</h2>

			{#if form?.error}
				<div class="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/createTenant" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<label for="name" class="block text-sm font-medium text-foreground mb-1.5">Name</label>
					<input
						type="text"
						id="name"
						name="name"
						value={form?.name || ''}
						required
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="Organization name"
					/>
				</div>
				<div>
					<label for="slug" class="block text-sm font-medium text-foreground mb-1.5">Slug</label>
					<input
						type="text"
						id="slug"
						name="slug"
						value={form?.slug || ''}
						required
						pattern="[a-z0-9-]+"
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
						placeholder="org-slug"
					/>
				</div>
				<div>
					<label for="plan" class="block text-sm font-medium text-foreground mb-1.5">Plan</label>
					<select
						id="plan"
						name="plan"
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="free" selected={form?.plan === 'free' || !form?.plan}>Free</option>
						<option value="starter" selected={form?.plan === 'starter'}>Starter</option>
						<option value="pro" selected={form?.plan === 'pro'}>Pro</option>
						<option value="enterprise" selected={form?.plan === 'enterprise'}>Enterprise</option>
					</select>
				</div>
				<div class="sm:col-span-3 flex items-center gap-3">
					<button
						type="submit"
						class="rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
					>
						Create organization
					</button>
					<button
						type="button"
						onclick={() => (showForm = false)}
						class="rounded-2xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if form?.success}
		<div class="mb-6 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">
			Organization created successfully.
		</div>
	{/if}

	<!-- Orgs list -->
	<div class="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
		<div class="px-5 py-4 border-b border-border">
			<h2 class="text-base font-semibold text-foreground">All Organizations ({orgs.length})</h2>
		</div>
		{#if orgs.length === 0}
			<div class="p-12 text-center">
				<Building2 class="mx-auto h-12 w-12 text-muted-foreground" />
				<p class="mt-4 text-sm text-muted-foreground">No organizations yet</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-border">
					<thead class="bg-secondary/50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Plan</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Members</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border bg-card">
						{#each orgs as o}
							<tr class="hover:bg-secondary/50 transition">
								<td class="px-4 py-3 text-sm font-medium text-foreground">{o.name}</td>
								<td class="px-4 py-3 text-sm font-mono text-muted-foreground">{o.slug}</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium capitalize text-primary">
										{o.plan || 'free'}
									</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {o.status === 'active' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}">
										{o.status}
									</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center gap-1 text-sm text-muted-foreground">
										<Users class="h-3.5 w-3.5" />
										{o.member_count}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{formatDate(o.createdat)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Recent memberships -->
	{#if memberships.length > 0}
		<div class="mt-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
			<div class="px-5 py-4 border-b border-border">
				<h2 class="text-base font-semibold text-foreground">Recent Memberships</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-border">
					<thead class="bg-secondary/50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">User</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Granted</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border bg-card">
						{#each memberships as m}
							<tr class="hover:bg-secondary/50 transition">
								<td class="px-4 py-3 text-sm font-medium text-foreground">{m.user_name || '-'}</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{m.user_email || '-'}</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium capitalize text-accent">
										{m.role}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-muted-foreground">{formatDate(m.createdat)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
