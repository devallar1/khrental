<script>
	import { Wrench, Search } from 'lucide-svelte';

	let { data } = $props();

	const requests = $derived(data.requests || []);
	const statusFilter = $derived(data.statusFilter || 'all');

	const statuses = ['all', 'pending', 'in_progress', 'completed', 'cancelled'];

	const priorityBadge = (priority) => {
		const map = {
			urgent: 'bg-red-50 text-red-700',
			high: 'bg-red-50 text-red-700',
			medium: 'bg-amber-50 text-amber-700',
			low: 'bg-green-50 text-green-700'
		};
		return map[priority?.toLowerCase()] || 'bg-slate-50 text-slate-700';
	};

	const statusBadge = (status) => {
		const map = {
			pending: 'bg-amber-50 text-amber-700',
			in_progress: 'bg-blue-50 text-blue-700',
			completed: 'bg-emerald-50 text-emerald-700',
			cancelled: 'bg-slate-100 text-slate-500'
		};
		return map[status?.toLowerCase()] || 'bg-slate-50 text-slate-700';
	};

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const formatStatus = (s) => s?.replace(/_/g, ' ') || '-';
</script>

<svelte:head>
	<title>Maintenance - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Maintenance Requests</h1>
		<p class="mt-1 text-sm text-slate-500">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
	</div>

	<!-- Status filter tabs -->
	<div class="mb-6 flex flex-wrap gap-2">
		{#each statuses as s}
			<a
				href="/maintenance{s === 'all' ? '' : `?status=${s}`}"
				class="rounded-full px-3.5 py-1.5 text-sm font-medium transition {statusFilter === s
					? 'bg-slate-900 text-white'
					: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}"
			>
				{formatStatus(s === 'all' ? 'All' : s)}
			</a>
		{/each}
	</div>

	{#if requests.length === 0}
		<div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
			<Wrench class="mx-auto h-12 w-12 text-slate-300" />
			<h3 class="mt-4 text-sm font-medium text-slate-900">No maintenance requests</h3>
			<p class="mt-1 text-sm text-slate-500">
				{statusFilter !== 'all' ? `No ${formatStatus(statusFilter)} requests found.` : 'No requests have been submitted yet.'}
			</p>
		</div>
	{:else}
		<div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-slate-200">
					<thead class="bg-slate-50">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Title</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Property</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Rentee</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Priority</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
							<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 bg-white">
						{#each requests as req}
							<tr class="hover:bg-slate-50 transition">
								<td class="px-4 py-3">
									<a href="/maintenance/{req.id}" class="text-sm font-medium text-slate-900 hover:text-blue-600 transition">
										{req.title}
									</a>
								</td>
								<td class="px-4 py-3 text-sm text-slate-600">{req.property_name || '-'}</td>
								<td class="px-4 py-3 text-sm text-slate-600">{req.rentee_name || '-'}</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {priorityBadge(req.priority)}">
										{req.priority || '-'}
									</span>
								</td>
								<td class="px-4 py-3">
									<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize {statusBadge(req.status)}">
										{formatStatus(req.status)}
									</span>
								</td>
								<td class="px-4 py-3 text-sm text-slate-500">{formatDate(req.createdat)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
