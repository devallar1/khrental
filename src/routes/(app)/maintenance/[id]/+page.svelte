<script>
	import { ArrowLeft, Building2, User, Wrench, CalendarDays, AlertTriangle } from 'lucide-svelte';

	let { data } = $props();

	const req = $derived(data.request);

	const priorityBadge = (priority) => {
		const map = {
			urgent: 'bg-red-50 text-red-700 border-red-200',
			high: 'bg-red-50 text-red-700 border-red-200',
			medium: 'bg-amber-50 text-amber-700 border-amber-200',
			low: 'bg-green-50 text-green-700 border-green-200'
		};
		return map[priority?.toLowerCase()] || 'bg-slate-50 text-slate-700 border-slate-200';
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
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	};

	const formatStatus = (s) => s?.replace(/_/g, ' ') || '-';
</script>

<svelte:head>
	<title>{req.title} - Maintenance - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<a href="/maintenance" class="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition mb-4">
			<ArrowLeft class="h-4 w-4" />
			Back to Maintenance
		</a>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">{req.title}</h1>
			<div class="flex items-center gap-2">
				<span class="inline-flex rounded-full border px-3 py-1 text-sm font-medium capitalize {priorityBadge(req.priority)}">
					{req.priority || 'none'}
				</span>
				<span class="inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize {statusBadge(req.status)}">
					{formatStatus(req.status)}
				</span>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Main details -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Description -->
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Description</h2>
				<p class="text-sm text-slate-700 whitespace-pre-wrap">{req.description || 'No description provided.'}</p>
			</div>

			<!-- Notes -->
			{#if req.notes}
				<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">Notes</h2>
					<p class="text-sm text-slate-700 whitespace-pre-wrap">{req.notes}</p>
				</div>
			{/if}
		</div>

		<!-- Sidebar info -->
		<div class="space-y-6">
			<!-- Property -->
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-2 mb-3">
					<Building2 class="h-4 w-4 text-slate-400" />
					<h3 class="text-sm font-semibold text-slate-700">Property</h3>
				</div>
				<p class="text-sm font-medium text-slate-900">{req.property_name || '-'}</p>
				{#if req.property_address}
					<p class="text-xs text-slate-500 mt-0.5">{req.property_address}</p>
				{/if}
			</div>

			<!-- Rentee -->
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-2 mb-3">
					<User class="h-4 w-4 text-slate-400" />
					<h3 class="text-sm font-semibold text-slate-700">Reported By</h3>
				</div>
				<p class="text-sm font-medium text-slate-900">{req.rentee_name || '-'}</p>
				{#if req.rentee_email}
					<p class="text-xs text-slate-500 mt-0.5">{req.rentee_email}</p>
				{/if}
			</div>

			<!-- Assigned To -->
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-2 mb-3">
					<Wrench class="h-4 w-4 text-slate-400" />
					<h3 class="text-sm font-semibold text-slate-700">Assigned To</h3>
				</div>
				<p class="text-sm font-medium text-slate-900">{req.assigned_name || 'Unassigned'}</p>
				{#if req.assigned_email}
					<p class="text-xs text-slate-500 mt-0.5">{req.assigned_email}</p>
				{/if}
			</div>

			<!-- Meta -->
			<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<div class="flex items-center gap-2 mb-3">
					<CalendarDays class="h-4 w-4 text-slate-400" />
					<h3 class="text-sm font-semibold text-slate-700">Details</h3>
				</div>
				<div class="space-y-2">
					<div>
						<p class="text-xs text-slate-400">Request Type</p>
						<p class="text-sm capitalize text-slate-900">{req.requesttype || '-'}</p>
					</div>
					<div>
						<p class="text-xs text-slate-400">Created</p>
						<p class="text-sm text-slate-900">{formatDate(req.createdat)}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
