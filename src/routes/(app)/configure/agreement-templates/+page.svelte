<script>
	import { Plus, FileText, ArrowLeft } from 'lucide-svelte';

	let { data } = $props();

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};
</script>

<svelte:head>
	<title>Agreement Templates - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6">
		<a
			href="/agreements"
			class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Agreements
		</a>

		<div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<h1 class="text-2xl font-bold text-foreground sm:text-3xl">Agreement Templates</h1>
				<p class="mt-1 text-sm text-muted-foreground">{data.templates.length} template{data.templates.length !== 1 ? 's' : ''}</p>
			</div>
			<a
				href="/configure/agreement-templates/new"
				class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Plus class="h-4 w-4" />
				New Template
			</a>
		</div>
	</div>

	<!-- Templates list -->
	{#if data.templates.length > 0}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-border bg-secondary/50">
							<th class="px-4 py-3 font-medium text-muted-foreground">Name</th>
							<th class="px-4 py-3 font-medium text-muted-foreground">Language</th>
							<th class="px-4 py-3 font-medium text-muted-foreground">Version</th>
							<th class="px-4 py-3 font-medium text-muted-foreground">Created</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each data.templates as template}
							<tr class="transition hover:bg-secondary/50">
								<td class="px-4 py-3">
									<span class="font-medium text-foreground">{template.name}</span>
								</td>
								<td class="px-4 py-3 text-muted-foreground">{template.language || 'English'}</td>
								<td class="px-4 py-3">
									<span class="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
										v{template.version || '1.0'}
									</span>
								</td>
								<td class="px-4 py-3 text-muted-foreground">{formatDate(template.createdat)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
			<FileText class="mx-auto h-12 w-12 text-muted-foreground" />
			<h3 class="mt-4 text-sm font-medium text-foreground">No templates yet</h3>
			<p class="mt-1 text-sm text-muted-foreground">Create a template to use when drafting agreements.</p>
			<a
				href="/configure/agreement-templates/new"
				class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Plus class="h-4 w-4" />
				New Template
			</a>
		</div>
	{/if}
</div>
