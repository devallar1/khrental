<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft, Plus, Pencil, Archive, RotateCcw, Save, X, Wallet } from 'lucide-svelte';

	let { data, form } = $props();

	const profiles = $derived(data.profiles || []);
	const tenants = $derived(data.tenants || []);

	let showArchived = $state(false);
	let mode = $state('list'); // 'list' | 'new' | { id: string }
	let actionError = $state(null);
	let submitting = $state(false);

	const filtered = $derived(
		profiles.filter((p) => (showArchived ? true : p.active !== false))
	);

	const editing = $derived(
		typeof mode === 'object' && mode?.id ? profiles.find((p) => p.id === mode.id) : null
	);

	function openNew() {
		actionError = null;
		mode = 'new';
	}
	function openEdit(id) {
		actionError = null;
		mode = { id };
	}
	function back() {
		actionError = null;
		mode = 'list';
	}

	function onMutate() {
		submitting = true;
		actionError = null;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'failure') {
				actionError = result.data?.error || 'Failed';
				await update({ reset: false });
				return;
			}
			await update({ reset: false });
			mode = 'list';
		};
	}

	function onArchive() {
		submitting = true;
		actionError = null;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	}
</script>

<svelte:head>
	<title>Bank profiles · KH Rentals</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<div class="mb-6 flex items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<a
				href="/properties"
				class="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
				aria-label="Back to properties"
			>
				<ArrowLeft class="h-4 w-4" />
			</a>
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-foreground">
					<Wallet class="h-5 w-5 text-muted-foreground" />
					Bank profiles
				</h1>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Account details that get stamped on rentee invoices. Each unit can route to a different profile.
				</p>
			</div>
		</div>
		{#if mode === 'list'}
			<button
				type="button"
				onclick={openNew}
				class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Plus class="h-4 w-4" />
				New profile
			</button>
		{:else}
			<button
				type="button"
				onclick={back}
				class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary/50"
			>
				<X class="h-4 w-4" />
				Cancel
			</button>
		{/if}
	</div>

	{#if actionError}
		<div class="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
			{actionError}
		</div>
	{/if}

	{#if mode === 'list'}
		<label class="mb-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
			<input type="checkbox" bind:checked={showArchived} class="accent-slate-900" />
			Show archived
		</label>

		<div class="rounded-2xl border border-border bg-card shadow-sm">
			{#if filtered.length === 0}
				<div class="p-8 text-center text-sm text-muted-foreground">
					No bank profiles yet. Add one to start invoicing.
				</div>
			{:else}
				<ul class="divide-y divide-slate-100">
					{#each filtered as p (p.id)}
						<li class="flex items-center justify-between gap-3 p-4 {p.active ? '' : 'opacity-55'}">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-semibold text-foreground">{p.label}</span>
									<span class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{p.tenant_name}</span>
									{#if !p.active}
										<span class="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">archived</span>
									{/if}
								</div>
								<div class="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
									<span><span class="text-muted-foreground">Holder:</span> {p.account_holder_name}</span>
									<span><span class="text-muted-foreground">A/C:</span> <span class="font-mono">{p.account_number}</span></span>
									<span><span class="text-muted-foreground">Bank:</span> {p.bank_name}</span>
									{#if p.branch}<span><span class="text-muted-foreground">Branch:</span> {p.branch}</span>{/if}
								</div>
							</div>
							<div class="flex items-center gap-1.5">
								<button
									type="button"
									onclick={() => openEdit(p.id)}
									class="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-secondary/50 hover:text-foreground"
									title="Edit"
								>
									<Pencil class="h-3.5 w-3.5" />
								</button>
								{#if p.active}
									<form method="POST" action="?/archive" use:enhance={onArchive} class="inline">
										<input type="hidden" name="id" value={p.id} />
										<button
											type="submit"
											class="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
											title="Archive"
											onclick={(e) => { if (!confirm(`Archive "${p.label}"?`)) e.preventDefault(); }}
										>
											<Archive class="h-3.5 w-3.5" />
										</button>
									</form>
								{:else}
									<form method="POST" action="?/restore" use:enhance={onArchive} class="inline">
										<input type="hidden" name="id" value={p.id} />
										<button
											type="submit"
											class="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-success/10 hover:text-success"
											title="Restore"
										>
											<RotateCcw class="h-3.5 w-3.5" />
										</button>
									</form>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{:else if mode === 'new' || editing}
		{@const p = editing}
		<form
			method="POST"
			action={p ? '?/update' : '?/create'}
			use:enhance={onMutate}
			class="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
		>
			{#if p}
				<input type="hidden" name="id" value={p.id} />
			{/if}

			{#if !p}
				<label class="block">
					<span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Org *</span>
					<select
						name="tenant_id"
						required
						class="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
					>
						<option value="">— select —</option>
						{#each tenants as t}
							<option value={t.id}>{t.name}</option>
						{/each}
					</select>
				</label>
			{:else}
				<div class="rounded-xl bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
					<span class="font-semibold uppercase tracking-wide">Org:</span> {p.tenant_name}
				</div>
			{/if}

			<label class="block">
				<span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Label *</span>
				<input
					type="text"
					name="label"
					required
					value={p?.label ?? ''}
					placeholder="Kubeira Family · Commercial Bank Malabe"
					class="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
				/>
			</label>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Account holder *</span>
					<input
						type="text"
						name="account_holder_name"
						required
						value={p?.account_holder_name ?? ''}
						placeholder="T. Jeeva Madhumathi Fernando"
						class="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Account number *</span>
					<input
						type="text"
						name="account_number"
						required
						value={p?.account_number ?? ''}
						placeholder="8860034973"
						class="mt-1 w-full rounded-xl border border-border px-3 py-2 font-mono text-sm"
					/>
				</label>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<label class="block">
					<span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Bank *</span>
					<input
						type="text"
						name="bank_name"
						required
						value={p?.bank_name ?? ''}
						placeholder="Commercial Bank"
						class="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
					/>
				</label>
				<label class="block">
					<span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Branch</span>
					<input
						type="text"
						name="branch"
						value={p?.branch ?? ''}
						placeholder="Malabe"
						class="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
					/>
				</label>
			</div>

			<label class="block">
				<span class="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</span>
				<textarea
					name="notes"
					rows="2"
					class="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm"
					placeholder="Internal notes, references, etc."
				>{p?.notes ?? ''}</textarea>
			</label>

			<div class="flex items-center justify-end gap-2 border-t border-border pt-4">
				<button
					type="button"
					onclick={back}
					class="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary/50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={submitting}
					class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary disabled:opacity-50"
				>
					<Save class="h-4 w-4" />
					{submitting ? 'Saving…' : p ? 'Save changes' : 'Create profile'}
				</button>
			</div>
		</form>
	{/if}
</div>
