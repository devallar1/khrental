<script>
	import { Settings, User, Building2, ArrowRightLeft, FileText } from 'lucide-svelte';

	let { data } = $props();

	const user = $derived(data.user);
	const tenant = $derived(data.tenant);
	const tenants = $derived(data.tenants || []);
</script>

<svelte:head>
	<title>Settings - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Settings</h1>
		<p class="mt-1 text-sm text-slate-500">Manage your account and workspace</p>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Current User -->
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-blue-500 p-2.5 text-white">
					<User class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-slate-900">Your Account</h2>
			</div>
			<div class="space-y-3">
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Name</p>
					<p class="text-sm font-medium text-slate-900">{user?.name || '-'}</p>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
					<p class="text-sm font-medium text-slate-900">{user?.email || '-'}</p>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Role</p>
					<span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-700">
						{user?.role || '-'}
					</span>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">User Type</p>
					<p class="text-sm font-medium capitalize text-slate-900">{user?.user_type || '-'}</p>
				</div>
			</div>
		</div>

		<!-- Current Tenant -->
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-violet-500 p-2.5 text-white">
					<Building2 class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-slate-900">Current Workspace</h2>
			</div>
			{#if tenant}
				<div class="space-y-3">
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Name</p>
						<p class="text-sm font-medium text-slate-900">{tenant.name}</p>
					</div>
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Slug</p>
						<p class="text-sm font-mono text-slate-600">{tenant.slug}</p>
					</div>
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Plan</p>
						<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-700">
							{tenant.plan || 'free'}
						</span>
					</div>
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
						<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-700">
							{tenant.status}
						</span>
					</div>
				</div>
			{:else}
				<p class="text-sm text-slate-500">No workspace selected</p>
			{/if}
		</div>
	</div>

	<!-- Document Management -->
	<div class="mt-6">
		<a href="/settings/documents" class="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 hover:shadow transition group">
			<div class="flex items-center gap-3 mb-2">
				<div class="rounded-xl bg-teal-500 p-2.5 text-white">
					<FileText class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-slate-900 group-hover:text-slate-700">Document Management</h2>
			</div>
			<p class="text-sm text-slate-500">Upload, search, and manage documents via Paperless-ngx</p>
		</a>
	</div>

	<!-- Tenant Switcher -->
	{#if tenants.length > 1}
		<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-amber-500 p-2.5 text-white">
					<ArrowRightLeft class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-slate-900">Switch Workspace</h2>
			</div>
			<p class="text-sm text-slate-500 mb-4">You have access to {tenants.length} workspaces. Select one to switch.</p>
			<div class="space-y-2">
				{#each tenants as t}
					<form method="POST" action="?/switchTenant" class="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition">
						<input type="hidden" name="tenantId" value={t.id} />
						<div>
							<p class="text-sm font-medium text-slate-900">{t.name}</p>
							<p class="text-xs text-slate-500">{t.slug} &middot; {t.plan || 'free'}</p>
						</div>
						{#if t.id === tenant?.id}
							<span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Current</span>
						{:else}
							<button type="submit" class="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition">
								Switch
							</button>
						{/if}
					</form>
				{/each}
			</div>
		</div>
	{/if}
</div>
