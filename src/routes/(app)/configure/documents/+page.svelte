<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft, Upload, FileText, Tag, CheckCircle, XCircle, Download, Search } from 'lucide-svelte';

	let { data, form } = $props();

	const configured = $derived(data.configured);
	const accessible = $derived(data.accessible);
	const documents = $derived(data.documents || []);
	const tags = $derived(data.tags || []);
	const totalDocuments = $derived(data.totalDocuments || 0);

	let uploading = $state(false);
	let searchQuery = $state('');

	const filteredDocuments = $derived(() => {
		if (!searchQuery.trim()) return documents;
		const q = searchQuery.toLowerCase();
		return documents.filter(
			(d) =>
				(d.title || '').toLowerCase().includes(q) ||
				(d.correspondent_name || '').toLowerCase().includes(q)
		);
	});

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		try {
			return new Date(dateStr).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	function getTagName(tagId) {
		const tag = tags.find((t) => t.id === tagId);
		return tag?.name || `Tag #${tagId}`;
	}

	function getTagColor(tagId) {
		const tag = tags.find((t) => t.id === tagId);
		return tag?.color || '#94a3b8';
	}
</script>

<svelte:head>
	<title>Documents - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<a href="/configure" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-4">
			<ArrowLeft class="h-4 w-4" />
			Back to Settings
		</a>
		<h1 class="text-2xl font-bold text-foreground sm:text-3xl">Document Management</h1>
		<p class="mt-1 text-sm text-muted-foreground">Upload, search, and manage documents via Paperless-ngx</p>
	</div>

	<!-- Connection Status -->
	<div class="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
		<h2 class="text-lg font-semibold text-foreground mb-3">Paperless-ngx Status</h2>
		<div class="flex flex-wrap gap-4">
			<div class="flex items-center gap-2">
				{#if configured}
					<CheckCircle class="h-5 w-5 text-emerald-500" />
					<span class="text-sm text-foreground">Configured</span>
				{:else}
					<XCircle class="h-5 w-5 text-red-500" />
					<span class="text-sm text-foreground">Not configured</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if accessible}
					<CheckCircle class="h-5 w-5 text-emerald-500" />
					<span class="text-sm text-foreground">Accessible</span>
				{:else}
					<XCircle class="h-5 w-5 text-red-500" />
					<span class="text-sm text-foreground">Not accessible</span>
				{/if}
			</div>
			{#if accessible}
				<div class="flex items-center gap-2">
					<FileText class="h-5 w-5 text-blue-500" />
					<span class="text-sm text-foreground">{totalDocuments} document{totalDocuments !== 1 ? 's' : ''}</span>
				</div>
			{/if}
		</div>
		{#if !configured}
			<p class="mt-3 text-sm text-muted-foreground">
				Set <code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">PAPERLESS_URL</code> and
				<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">PAPERLESS_TOKEN</code> environment variables to connect.
			</p>
		{/if}
	</div>

	{#if configured && accessible}
		<!-- Upload Form -->
		<div class="mb-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-blue-500 p-2.5 text-white">
					<Upload class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-foreground">Upload Document</h2>
			</div>

			{#if form?.success}
				<div class="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
					<div class="flex items-center gap-2">
						<CheckCircle class="h-5 w-5 text-emerald-600" />
						<p class="text-sm font-medium text-emerald-800">Document uploaded successfully. It will appear in the list once processed.</p>
					</div>
				</div>
			{/if}

			{#if form?.error}
				<div class="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
					<p class="text-sm font-medium text-red-800">{form.error}</p>
				</div>
			{/if}

			<form
				method="POST"
				action="?/upload"
				enctype="multipart/form-data"
				use:enhance={() => {
					uploading = true;
					return async ({ update }) => {
						uploading = false;
						await update();
					};
				}}
			>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="sm:col-span-2">
						<label for="file" class="block text-sm font-medium text-foreground mb-1">File</label>
						<input
							type="file"
							id="file"
							name="file"
							required
							accept=".pdf,.png,.jpg,.jpeg,.tiff,.txt,.doc,.docx"
							class="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800 file:transition file:cursor-pointer"
						/>
					</div>
					<div>
						<label for="title" class="block text-sm font-medium text-foreground mb-1">Title (optional)</label>
						<input
							type="text"
							id="title"
							name="title"
							placeholder="Leave blank to use filename"
							class="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-foreground mb-1">Tags</label>
						<div class="flex flex-wrap gap-2 rounded-xl border border-slate-300 p-2 min-h-[42px]">
							{#each tags as tag}
								<label class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer hover:opacity-80 transition" style="background-color: {tag.color || '#f1f5f9'}; color: {tag.text_color || '#334155'}">
									<input type="checkbox" name="tags" value={tag.id} class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3" />
									{tag.name}
								</label>
							{/each}
							{#if tags.length === 0}
								<span class="text-xs text-muted-foreground">No tags available</span>
							{/if}
						</div>
					</div>
				</div>

				<div class="mt-4">
					<button
						type="submit"
						disabled={uploading}
						class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if uploading}
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
							Uploading...
						{:else}
							<Upload class="h-4 w-4" />
							Upload Document
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- Documents List -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
				<div class="flex items-center gap-3">
					<div class="rounded-xl bg-violet-500 p-2.5 text-white">
						<FileText class="h-5 w-5" />
					</div>
					<h2 class="text-lg font-semibold text-foreground">Recent Documents</h2>
				</div>
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Filter documents..."
						bind:value={searchQuery}
						class="rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none w-full sm:w-64"
					/>
				</div>
			</div>

			{#if filteredDocuments().length > 0}
				<div class="overflow-x-auto -mx-6">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-slate-100">
								<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</th>
								<th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-50">
							{#each filteredDocuments() as doc}
								<tr class="hover:bg-secondary/50 transition">
									<td class="px-6 py-3">
										<div class="flex items-center gap-2">
											<FileText class="h-4 w-4 text-muted-foreground flex-shrink-0" />
											<span class="font-medium text-foreground truncate max-w-xs">{doc.title || 'Untitled'}</span>
										</div>
									</td>
									<td class="px-6 py-3 text-muted-foreground whitespace-nowrap">
										{formatDate(doc.created)}
									</td>
									<td class="px-6 py-3">
										<div class="flex flex-wrap gap-1">
											{#each (doc.tags || []).slice(0, 4) as tagId}
												<span
													class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
													style="background-color: {getTagColor(tagId)}20; color: {getTagColor(tagId)}"
												>
													{getTagName(tagId)}
												</span>
											{/each}
											{#if (doc.tags || []).length > 4}
												<span class="text-xs text-muted-foreground">+{doc.tags.length - 4} more</span>
											{/if}
										</div>
									</td>
									<td class="px-6 py-3 text-right">
										<a
											href="/configure/documents/download/{doc.id}"
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-slate-200 transition"
										>
											<Download class="h-3.5 w-3.5" />
											Download
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="text-center py-12">
					<FileText class="h-12 w-12 text-muted-foreground mx-auto mb-3" />
					<p class="text-sm text-muted-foreground">
						{searchQuery ? 'No documents match your filter.' : 'No documents found.'}
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
