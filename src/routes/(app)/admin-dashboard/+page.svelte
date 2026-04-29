<script>
	import { LayoutDashboard, Server, Database, Shield } from 'lucide-svelte';

	let { data } = $props();

	const tenant = $derived(data.tenant);
	const user = $derived(data.user);
	const isDevBypass = $derived(Boolean(user?.is_dev_bypass));
</script>

<svelte:head>
	<title>Admin Dashboard - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Admin Dashboard</h1>
		<p class="mt-1 text-sm text-slate-500">System overview and administration</p>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- System Info -->
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-blue-500 p-2.5 text-white">
					<Server class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-slate-900">System Info</h2>
			</div>
			<div class="space-y-3">
				<div class="flex items-center justify-between py-2 border-b border-slate-100">
					<span class="text-sm text-slate-500">Platform</span>
					<span class="text-sm font-medium text-slate-900">SvelteKit</span>
				</div>
				<div class="flex items-center justify-between py-2 border-b border-slate-100">
					<span class="text-sm text-slate-500">Database</span>
					<span class="text-sm font-medium text-slate-900">PostgreSQL</span>
				</div>
				<div class="flex items-center justify-between py-2 border-b border-slate-100">
					<span class="text-sm text-slate-500">Auth Mode</span>
					{#if isDevBypass}
						<span class="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Dev Bypass</span>
					{:else}
						<span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Better-Auth</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Current Tenant -->
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-violet-500 p-2.5 text-white">
					<Database class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-slate-900">Active Tenant</h2>
			</div>
			{#if tenant}
				<div class="space-y-3">
					<div class="flex items-center justify-between py-2 border-b border-slate-100">
						<span class="text-sm text-slate-500">Name</span>
						<span class="text-sm font-medium text-slate-900">{tenant.name}</span>
					</div>
					<div class="flex items-center justify-between py-2 border-b border-slate-100">
						<span class="text-sm text-slate-500">Slug</span>
						<span class="text-sm font-mono text-slate-600">{tenant.slug}</span>
					</div>
					<div class="flex items-center justify-between py-2 border-b border-slate-100">
						<span class="text-sm text-slate-500">Plan</span>
						<span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700">{tenant.plan || 'free'}</span>
					</div>
					<div class="flex items-center justify-between py-2">
						<span class="text-sm text-slate-500">Status</span>
						<span class="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700">{tenant.status}</span>
					</div>
				</div>
			{:else}
				<p class="text-sm text-slate-500">No tenant selected</p>
			{/if}
		</div>

		<!-- Placeholder -->
		<div class="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-12 text-center">
			<LayoutDashboard class="mx-auto h-16 w-16 text-slate-300" />
			<h3 class="mt-4 text-lg font-semibold text-slate-900">Admin Dashboard</h3>
			<p class="mt-2 text-sm text-slate-500 max-w-md mx-auto">
				Advanced analytics, audit logs, and system monitoring will be available here.
			</p>
		</div>
	</div>
</div>
