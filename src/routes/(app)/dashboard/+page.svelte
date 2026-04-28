<script>
	import { Building2, Users, FileText, Receipt } from 'lucide-svelte';

	let { data } = $props();

	const cards = $derived([
		{ label: 'Properties', count: data.stats.properties, icon: Building2, href: '/properties', color: 'bg-blue-500' },
		{ label: 'Rentees', count: data.stats.rentees, icon: Users, href: '/rentees', color: 'bg-emerald-500' },
		{ label: 'Agreements', count: data.stats.agreements, icon: FileText, href: '/agreements', color: 'bg-violet-500' },
		{ label: 'Invoices', count: data.stats.invoices, icon: Receipt, href: '/invoices', color: 'bg-amber-500' }
	]);
</script>

<svelte:head>
	<title>Dashboard - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h1>
		{#if data.tenant}
			<p class="mt-1 text-sm text-slate-500">{data.tenant.name}</p>
		{/if}
	</div>

	<!-- Stats cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each cards as card}
			<a href={card.href} class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-slate-500">{card.label}</p>
						<p class="mt-1 text-3xl font-bold text-slate-900">{card.count}</p>
					</div>
					<div class="{card.color} rounded-xl p-3 text-white">
						<svelte:component this={card.icon} class="h-6 w-6" />
					</div>
				</div>
			</a>
		{/each}
	</div>

	<!-- Connection status -->
	<div class="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
		<h2 class="text-lg font-semibold text-slate-900">System Status</h2>
		<div class="mt-4 space-y-3">
			<div class="flex items-center gap-2">
				<span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
				<span class="text-sm text-slate-600">Database connected</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
				<span class="text-sm text-slate-600">Tenant: {data.tenant?.name || 'None'} ({data.tenant?.slug || '-'})</span>
			</div>
			<div class="flex items-center gap-2">
				<span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
				<span class="text-sm text-slate-600">Auth: Dev bypass (real auth deferred)</span>
			</div>
		</div>
	</div>
</div>
