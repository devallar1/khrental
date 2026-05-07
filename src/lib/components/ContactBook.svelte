<script>
	import { enhance } from '$app/forms';
	import { X, Plus, Search, Pencil, Archive, RotateCcw, Save, ArrowLeft, BookUser } from 'lucide-svelte';
	import TenantWizard from './TenantWizard.svelte';

	let {
		rentees = [],
		realm = [],
		bankProfiles = [],
		// One-shot route hint applied on mount: open the wizard pre-filled
		// with a unit, or jump straight into editing a rentee. Shape:
		//   { type: 'wizard', propertyId, unitId }
		//   { type: 'editIdentity', renteeId }
		initialContext = null,
		onClose
	} = $props();

	let query = $state('');
	let showArchived = $state(false);

	// Resolve the initial mode from the route hint. Done at module init so the
	// wizard / edit form mounts directly on the first frame.
	const resolveInitialMode = () => {
		if (initialContext?.type === 'wizard') {
			return { kind: 'wizard', propertyId: initialContext.propertyId || '', unitId: initialContext.unitId || '' };
		}
		if (initialContext?.type === 'editIdentity' && initialContext.renteeId) {
			return { kind: 'edit', id: initialContext.renteeId };
		}
		return 'list';
	};

	// One of: 'list' | { kind: 'wizard', propertyId, unitId } | { kind: 'edit', id }
	let mode = $state(resolveInitialMode());
	let actionError = $state(null);
	let submitting = $state(false);

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return rentees
			.filter((r) => showArchived ? true : r.active !== false)
			.filter((r) => {
				if (!q) return true;
				return (
					(r.name || '').toLowerCase().includes(q) ||
					(r.email || '').toLowerCase().includes(q) ||
					(r.phone || '').toLowerCase().includes(q) ||
					(r.national_id || '').toLowerCase().includes(q)
				);
			});
	});

	const editing = $derived(
		typeof mode === 'object' && mode?.kind === 'edit'
			? rentees.find((r) => r.id === mode.id)
			: null
	);
	const wizardCtx = $derived(
		typeof mode === 'object' && mode?.kind === 'wizard'
			? { propertyId: mode.propertyId || '', unitId: mode.unitId || '' }
			: null
	);

	function openNew() {
		actionError = null;
		mode = { kind: 'wizard', propertyId: '', unitId: '' };
	}

	function openEdit(id) {
		actionError = null;
		mode = { kind: 'edit', id };
	}

	function backToList() {
		actionError = null;
		mode = 'list';
	}

	function onSubmit() {
		submitting = true;
		actionError = null;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'failure') {
				actionError = result.data?.error || 'Save failed';
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
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'failure') {
				actionError = result.data?.error || 'Archive failed';
				await update({ reset: false });
				return;
			}
			await update({ reset: false });
			mode = 'list';
		};
	}

	function onRestore() {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	}
</script>

<aside class="book" role="dialog" aria-label="Tenant contact book">
	<header class="book-header">
		{#if mode === 'list'}
			<div class="book-title">
				<BookUser class="h-4 w-4" />
				<span>Contact book</span>
				<span class="book-count">{filtered.length}</span>
			</div>
		{:else}
			<button type="button" class="book-back" onclick={backToList} title="Back">
				<ArrowLeft class="h-4 w-4" />
				<span>Back</span>
			</button>
		{/if}
		<button type="button" class="book-close" onclick={() => onClose?.()} title="Close" aria-label="Close">
			<X class="h-4 w-4" />
		</button>
	</header>

	{#if actionError}
		<div class="book-error">{actionError}</div>
	{/if}

	{#if mode === 'list'}
		<div class="book-toolbar">
			<div class="search">
				<Search class="h-3.5 w-3.5" />
				<input
					type="search"
					placeholder="Search by name, email, phone, NIC…"
					bind:value={query}
				/>
			</div>
			<button type="button" class="new-btn" onclick={openNew} title="Add tenant">
				<Plus class="h-4 w-4" />
				<span>New</span>
			</button>
		</div>

		<label class="archived-toggle">
			<input type="checkbox" bind:checked={showArchived} />
			Show archived
		</label>

		<ul class="rentee-list">
			{#each filtered as r (r.id)}
				<li class="rentee-row" class:archived={!r.active}>
					<div class="rentee-info">
						<div class="rentee-name">
							{r.name || '—'}
							{#if !r.active}
								<span class="archived-badge">archived</span>
							{/if}
						</div>
						<div class="rentee-meta">
							{#if r.phone}<span>{r.phone}</span>{/if}
							{#if r.email}<span>{r.email}</span>{/if}
							{#if r.national_id}<span>NIC {r.national_id}</span>{/if}
						</div>
					</div>
					<div class="rentee-actions">
						<button type="button" class="row-btn" onclick={() => openEdit(r.id)} title="Edit">
							<Pencil class="h-3.5 w-3.5" />
						</button>
						{#if r.active}
							<form
								method="POST"
								action="?/archiveRentee"
								use:enhance={onArchive}
								class="inline-form"
							>
								<input type="hidden" name="id" value={r.id} />
								<button
									type="submit"
									class="row-btn danger"
									title="Archive (soft-delete)"
									onclick={(e) => { if (!confirm(`Archive ${r.name}?`)) e.preventDefault(); }}
								>
									<Archive class="h-3.5 w-3.5" />
								</button>
							</form>
						{:else}
							<form
								method="POST"
								action="?/restoreRentee"
								use:enhance={onRestore}
								class="inline-form"
							>
								<input type="hidden" name="id" value={r.id} />
								<button type="submit" class="row-btn" title="Restore">
									<RotateCcw class="h-3.5 w-3.5" />
								</button>
							</form>
						{/if}
					</div>
				</li>
			{/each}
			{#if filtered.length === 0}
				<li class="empty">No rentees match.</li>
			{/if}
		</ul>
	{:else if wizardCtx}
		<TenantWizard
			{rentees}
			{realm}
			{bankProfiles}
			initialPropertyId={wizardCtx.propertyId}
			initialUnitId={wizardCtx.unitId}
			onCancel={() => (mode = 'list')}
			onSaved={() => (mode = 'list')}
		/>
	{:else if editing}
		{@const r = editing}
		<form
			method="POST"
			action={'?/updateRentee'}
			use:enhance={onSubmit}
			class="rentee-form"
		>
			<input type="hidden" name="id" value={r.id} />

			<label class="field">
				<span>Name *</span>
				<input type="text" name="name" required value={r?.name ?? ''} placeholder="Full name" />
			</label>

			<label class="field">
				<span>Phone</span>
				<input type="tel" name="phone" value={r?.phone ?? ''} placeholder="+94 7…" />
			</label>

			<label class="field">
				<span>Email</span>
				<input type="email" name="email" value={r?.email ?? ''} placeholder="name@example.com" />
			</label>

			<label class="field">
				<span>NIC</span>
				<input type="text" name="national_id" value={r?.national_id ?? ''} placeholder="National ID" />
			</label>

			<label class="field">
				<span>Permanent address</span>
				<textarea name="permanent_address" rows="2" placeholder="Home address">{r?.permanent_address ?? ''}</textarea>
			</label>

			<label class="field">
				<span>Notes</span>
				<textarea name="notes" rows="2" placeholder="Anything to remember">{r?.notes ?? ''}</textarea>
			</label>

			<div class="form-actions">
				<button type="button" class="ghost" onclick={backToList} disabled={submitting}>
					Cancel
				</button>
				<button type="submit" class="primary" disabled={submitting}>
					<Save class="h-3.5 w-3.5" />
					{submitting ? 'Saving…' : (r ? 'Save changes' : 'Add tenant')}
				</button>
			</div>
		</form>
	{/if}
</aside>

<style>
	.book {
		position: fixed;
		top: 0;
		right: 56px;
		bottom: 0;
		width: 380px;
		display: flex;
		flex-direction: column;
		background: hsl(var(--background) / 0.96);
		backdrop-filter: blur(10px);
		border-left: 1px solid hsl(var(--border));
		box-shadow: -16px 0 48px -16px hsl(0 0% 0% / 0.5);
		color: hsl(var(--foreground));
		z-index: 14;
		overflow: hidden;
	}

	.book-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid hsl(var(--border));
	}
	.book-title {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: hsl(var(--accent));
	}
	.book-count {
		display: inline-block;
		padding: 1px 7px;
		border-radius: 999px;
		background: hsl(var(--accent) / 0.15);
		color: hsl(var(--accent));
		font-size: 11px;
		font-weight: 600;
	}
	.book-back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		background: transparent;
		color: hsl(var(--foreground) / 0.85);
		border: 1px solid transparent;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
	}
	.book-back:hover {
		background: hsl(var(--card));
		color: hsl(var(--accent));
	}
	.book-close {
		display: inline-flex;
		width: 28px;
		height: 28px;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		border: 1px solid transparent;
		background: transparent;
		color: hsl(var(--foreground) / 0.85);
		cursor: pointer;
	}
	.book-close:hover {
		background: hsl(var(--card));
		color: hsl(var(--foreground));
	}

	.book-error {
		margin: 8px 14px 0;
		padding: 7px 10px;
		background: hsl(var(--destructive) / 0.15);
		border: 1px solid hsl(var(--destructive) / 0.4);
		border-radius: 8px;
		color: hsl(var(--destructive));
		font-size: 12px;
	}

	/* Toolbar */
	.book-toolbar {
		display: flex;
		gap: 8px;
		padding: 10px 14px 6px;
	}
	.search {
		flex: 1;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		color: hsl(var(--muted-foreground));
	}
	.search input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		outline: none;
		color: hsl(var(--foreground));
		font-size: 12.5px;
	}
	.new-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		background: hsl(var(--accent));
		color: hsl(var(--background));
		border: 1px solid hsl(var(--accent));
		border-radius: 8px;
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
	}
	.new-btn:hover { filter: brightness(1.08); }

	.archived-toggle {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 14px 8px;
		font-size: 11.5px;
		color: hsl(var(--muted-foreground));
		user-select: none;
	}
	.archived-toggle input { accent-color: hsl(var(--accent)); }

	/* List */
	.rentee-list {
		flex: 1;
		overflow-y: auto;
		list-style: none;
		margin: 0;
		padding: 0 8px 12px;
	}
	.rentee-row {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 8px;
		border-radius: 8px;
		border: 1px solid transparent;
		transition: background 80ms ease, border-color 80ms ease;
	}
	.rentee-row:hover {
		background: hsl(var(--card) / 0.6);
		border-color: hsl(var(--border));
	}
	.rentee-row.archived { opacity: 0.55; }
	.rentee-info { flex: 1; min-width: 0; }
	.rentee-name {
		font-size: 13px;
		font-weight: 600;
		color: hsl(var(--foreground));
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.archived-badge {
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		padding: 1px 5px;
		border-radius: 4px;
		background: hsl(var(--muted-foreground) / 0.7);
		color: hsl(var(--foreground) / 0.85);
	}
	.rentee-meta {
		margin-top: 2px;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		font-size: 11px;
		color: hsl(var(--muted-foreground));
	}
	.rentee-actions {
		display: inline-flex;
		gap: 4px;
		flex-shrink: 0;
	}
	.inline-form { display: inline; }
	.row-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		background: transparent;
		color: hsl(var(--foreground) / 0.85);
		border: 1px solid transparent;
		border-radius: 6px;
		cursor: pointer;
	}
	.row-btn:hover {
		background: hsl(var(--secondary));
		color: hsl(var(--foreground));
		border-color: hsl(var(--border));
	}
	.row-btn.danger:hover {
		color: hsl(var(--destructive));
		border-color: hsl(var(--destructive) / 0.4);
	}

	.empty {
		padding: 24px 12px;
		text-align: center;
		font-size: 12px;
		color: hsl(var(--muted-foreground));
	}

	/* Form */
	.rentee-form {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.field { display: flex; flex-direction: column; gap: 4px; }
	.field > span {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: hsl(var(--muted-foreground));
	}
	.field input,
	.field textarea {
		padding: 7px 10px;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		color: hsl(var(--foreground));
		font-size: 12.5px;
		font-family: inherit;
		outline: none;
	}
	.field input:focus,
	.field textarea:focus { border-color: hsl(var(--accent) / 0.6); }

	.form-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
		margin-top: 4px;
	}
	.form-actions button {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 7px 12px;
		font-size: 12.5px;
		font-weight: 600;
		border-radius: 8px;
		cursor: pointer;
	}
	.form-actions button.ghost {
		background: transparent;
		color: hsl(var(--foreground) / 0.85);
		border: 1px solid hsl(var(--border));
	}
	.form-actions button.ghost:hover {
		background: hsl(var(--card));
		color: hsl(var(--foreground));
	}
	.form-actions button.primary {
		background: hsl(var(--accent));
		color: hsl(var(--background));
		border: 1px solid hsl(var(--accent));
	}
	.form-actions button.primary:hover { filter: brightness(1.08); }
	.form-actions button[disabled] { opacity: 0.6; cursor: not-allowed; }
</style>
