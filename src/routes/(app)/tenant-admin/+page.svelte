<script>
	import { ShieldCheck, Plus, Users, Building2 } from 'lucide-svelte';

	let { data, form } = $props();

	const tenants = $derived(data.tenants || []);
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
	<title>Tenant Admin - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Tenant Admin</h1>
			<p class="mt-1 text-sm text-slate-500">Manage all tenants and memberships</p>
		</div>
		<button
			onclick={() => (showForm = !showForm)}
			class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
		>
			<Plus class="h-4 w-4" />
			New Tenant
		</button>
	</div>

	<!-- Create form -->
	{#if showForm}
		<div class="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="text-lg font-semibold text-slate-900 mb-4">Create New Tenant</h2>

			{#if form?.error}
				<div class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{form.error}
				</div>
			{/if}

			<form method="POST" action="?/createTenant" class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<div>
					<label for="name" class="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
					<input
						type="text"
						id="name"
						name="name"
						value={form?.name || ''}
						required
						class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="Tenant name"
					/>
				</div>
				<div>
					<label for="slug" class="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
					<input
						type="text"
						id="slug"
						name="slug"
						value={form?.slug || ''}
						required
						pattern="[a-z0-9-]+"
						class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						placeholder="tenant-slug"
					/>
				</div>
				<div>
					<label for="plan" class="block text-sm font-medium text-slate-700 mb-1.5">Plan</label>
					<select
						id="plan"
						name="plan"
						class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
						class="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
					>
						Create Tenant
					</button>
					<button
						type="button"
						onclick={() => (showForm = false)}
						class="rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if form?.success}
		<div class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
			Tenant created successfully.
		</div>
	{/if}

	<!-- Tenants list -->
	<div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
		<div class="px-5 py-4 border-b border-slate-100">
			<h2 class="text-base font-semibold text-slate-900">All Tenants ({tenants.length})</h2>
		</div>
		{#if tenants.length === 0}
			<div class="p-12 text-center">
				<Building2 class="mx-auto h-12 w-12 text-slate-300" />
				<p class="mt-4 text-sm text-slate-500">No tenants found</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200">
					<thead class="bg-slate-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Slug</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Plan</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Members</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 bg-white">
						{#each tenants as t}
							<tr class="hover:bg-slate-50 transition">
								<td class="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
								<td class="px-4 py-3 text-sm font-mono text-slate-600">{t.slug}</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
										{t.plan || 'free'}
									</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
										{t.status}
									</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center gap-1 text-sm text-slate-600">
										<Users class="h-3.5 w-3.5" />
										{t.member_count}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-slate-500">{formatDate(t.createdat)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Recent memberships -->
	{#if memberships.length > 0}
		<div class="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
			<div class="px-5 py-4 border-b border-slate-100">
				<h2 class="text-base font-semibold text-slate-900">Recent Memberships</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200">
					<thead class="bg-slate-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">User</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Role</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Joined</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 bg-white">
						{#each memberships as m}
							<tr class="hover:bg-slate-50 transition">
								<td class="px-4 py-3 text-sm font-medium text-slate-900">{m.user_name || '-'}</td>
								<td class="px-4 py-3 text-sm text-slate-600">{m.user_email || '-'}</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium capitalize text-violet-700">
										{m.role}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-slate-500">{formatDate(m.createdat)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
