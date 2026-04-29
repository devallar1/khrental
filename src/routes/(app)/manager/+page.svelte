<script>
	import { enhance } from '$app/forms';
	import {
		Phone, Mail, ScrollText, Zap, Droplets, Wifi,
		User, UserPlus, Home as HomeIcon,
		ChevronLeft, Building2, TreePine, Layers, ArrowRight,
		Plus, Minus, Maximize2, StickyNote, X
	} from 'lucide-svelte';
	import panzoom from 'panzoom';

	let { data, form } = $props();
	const realm = $derived(data.realm || []);

	let selectedPropertyId = $state(null);
	const selectedProperty = $derived(realm.find((p) => p.id === selectedPropertyId) || null);
	let activeFormUnit = $state(null);

	let pzInstance = null;
	let viewportEl = $state();

	// Per-card free positions { [propertyId]: {x, y} }
	const POS_KEY = 'manager_card_positions';
	let cardPositions = $state({});
	let positionsInitialized = false;

	const COLS = 4;
	const COL_W = 360;
	const ROW_H = 520;
	const defaultPos = (i) => ({
		x: (i % COLS) * COL_W + 20,
		y: Math.floor(i / COLS) * ROW_H + 20
	});

	$effect(() => {
		if (positionsInitialized) return;
		if (realm.length === 0) return;
		let stored = {};
		try { stored = JSON.parse(localStorage.getItem(POS_KEY) || '{}'); } catch {}
		const init = {};
		realm.forEach((p, i) => { init[p.id] = stored[p.id] || defaultPos(i); });
		cardPositions = init;
		positionsInitialized = true;
	});

	// ---- Sticky notes ------------------------------------------------------
	const NOTES_KEY = 'manager_sticky_notes';
	let stickyNotes = $state([]);
	let notesInitialized = false;

	$effect(() => {
		if (notesInitialized) return;
		try { stickyNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch { stickyNotes = []; }
		notesInitialized = true;
	});

	function persistNotes() {
		try { localStorage.setItem(NOTES_KEY, JSON.stringify(stickyNotes)); } catch {}
	}

	const noteRotation = (id) => {
		// stable pseudo-random rotation per note id
		let h = 0;
		for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
		return ((h % 7) - 3); // -3..+3 deg
	};

	function addNote() {
		// Spawn at the viewport center, in canvas coords
		const center = screenToCanvas(
			(viewportEl?.getBoundingClientRect().left ?? 0) + (viewportEl?.clientWidth ?? 0) / 2,
			(viewportEl?.getBoundingClientRect().top ?? 0) + (viewportEl?.clientHeight ?? 0) / 2
		);
		const id = `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		stickyNotes = [
			...stickyNotes,
			{
				id,
				content: '',
				attachedTo: 'canvas',
				x: Math.round(center.x - 90),
				y: Math.round(center.y - 80)
			}
		];
		persistNotes();
	}

	function deleteNote(noteId) {
		stickyNotes = stickyNotes.filter((n) => n.id !== noteId);
		persistNotes();
	}

	function updateNoteContent(noteId, content) {
		stickyNotes = stickyNotes.map((n) => (n.id === noteId ? { ...n, content } : n));
		persistNotes();
	}

	/** Svelte action: persist note size after CSS resize (debounced). */
	function resizableNote(node, noteId) {
		let id = noteId;
		let timer;
		const ro = new ResizeObserver(() => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				const w = Math.round(node.offsetWidth);
				const h = Math.round(node.offsetHeight);
				const note = stickyNotes.find((n) => n.id === id);
				if (!note) return;
				if (note.width === w && note.height === h) return;
				stickyNotes = stickyNotes.map((n) => (n.id === id ? { ...n, width: w, height: h } : n));
				persistNotes();
			}, 200);
		});
		ro.observe(node);
		return {
			update(newId) { id = newId; },
			destroy() { ro.disconnect(); clearTimeout(timer); }
		};
	}

	function screenToCanvas(clientX, clientY) {
		const t = pzInstance?.getTransform() ?? { x: 0, y: 0, scale: 1 };
		const r = viewportEl?.getBoundingClientRect() ?? { left: 0, top: 0 };
		return {
			x: (clientX - r.left - t.x) / t.scale,
			y: (clientY - r.top - t.y) / t.scale
		};
	}

	// Effective absolute (canvas) position of a note, even when attached to a card
	function noteAbsolutePos(note) {
		if (note.attachedTo === 'canvas') return { x: note.x, y: note.y };
		const cp = cardPositions[note.attachedTo];
		if (!cp) return { x: note.x, y: note.y };
		return { x: cp.x + note.x, y: cp.y + note.y };
	}

	// ---- Unified drag (cards + notes) -------------------------------------
	let dragState = null;

	function onCardMouseDown(e, propertyId) {
		if (e.button !== 0) return;
		if (e.target.closest('a, input, form, label, select, textarea, .sticky-note')) return;
		e.stopPropagation();
		const scale = pzInstance?.getTransform()?.scale ?? 1;
		const cur = cardPositions[propertyId] || { x: 0, y: 0 };
		dragState = {
			type: 'card',
			id: propertyId,
			startMouseX: e.clientX,
			startMouseY: e.clientY,
			startX: cur.x,
			startY: cur.y,
			scale,
			moved: false
		};
		window.addEventListener('mousemove', onWindowMove);
		window.addEventListener('mouseup', onWindowUp);
	}

	function onNoteMouseDown(e, noteId) {
		if (e.button !== 0) return;
		if (e.target.closest('textarea, button')) return;
		// Skip drag when the mousedown lands on the browser's CSS resize grip
		// (bottom-right ~18px square). Lets the native resize gesture take over.
		const rect = e.currentTarget.getBoundingClientRect();
		if (e.clientX > rect.right - 18 && e.clientY > rect.bottom - 18) return;
		e.stopPropagation();
		const note = stickyNotes.find((n) => n.id === noteId);
		if (!note) return;
		const abs = noteAbsolutePos(note);
		const scale = pzInstance?.getTransform()?.scale ?? 1;
		dragState = {
			type: 'note',
			id: noteId,
			startMouseX: e.clientX,
			startMouseY: e.clientY,
			startX: abs.x,
			startY: abs.y,
			scale,
			moved: false
		};
		window.addEventListener('mousemove', onWindowMove);
		window.addEventListener('mouseup', onWindowUp);
	}

	function onWindowMove(e) {
		if (!dragState) return;
		const dx = e.clientX - dragState.startMouseX;
		const dy = e.clientY - dragState.startMouseY;
		if (!dragState.moved && Math.hypot(dx, dy) < 4) return;
		dragState.moved = true;
		const newX = dragState.startX + dx / dragState.scale;
		const newY = dragState.startY + dy / dragState.scale;
		if (dragState.type === 'card') {
			cardPositions = { ...cardPositions, [dragState.id]: { x: newX, y: newY } };
		} else {
			// While dragging, treat the note as canvas-positioned
			stickyNotes = stickyNotes.map((n) =>
				n.id === dragState.id ? { ...n, attachedTo: 'canvas', x: newX, y: newY } : n
			);
		}
	}

	function onWindowUp(e) {
		if (!dragState) return;
		const wasNote = dragState.type === 'note';
		const noteId = dragState.id;
		const moved = dragState.moved;

		if (moved && wasNote) {
			// Detect drop on a property card
			const cardEl = document
				.elementFromPoint(e.clientX, e.clientY)
				?.closest('.property-card');
			const droppedPropertyId = cardEl?.dataset.propertyId || null;
			if (droppedPropertyId && cardPositions[droppedPropertyId]) {
				const note = stickyNotes.find((n) => n.id === noteId);
				if (note) {
					const cp = cardPositions[droppedPropertyId];
					stickyNotes = stickyNotes.map((n) =>
						n.id === noteId
							? { ...n, attachedTo: droppedPropertyId, x: note.x - cp.x, y: note.y - cp.y }
							: n
					);
				}
			}
			persistNotes();
		}
		if (moved && !wasNote) {
			try { localStorage.setItem(POS_KEY, JSON.stringify(cardPositions)); } catch {}
		}
		if (moved) {
			const suppressClick = (ev) => {
				ev.stopPropagation();
				ev.preventDefault();
				document.removeEventListener('click', suppressClick, true);
			};
			document.addEventListener('click', suppressClick, true);
		}
		window.removeEventListener('mousemove', onWindowMove);
		window.removeEventListener('mouseup', onWindowUp);
		dragState = null;
	}

	function resetLayout() {
		const init = {};
		realm.forEach((p, i) => { init[p.id] = defaultPos(i); });
		cardPositions = init;
		try { localStorage.removeItem(POS_KEY); } catch {}
	}

	// ---- Context menu (right-click on canvas) -----------------------------
	let contextMenu = $state({ open: false, x: 0, y: 0, canvasX: 0, canvasY: 0 });

	function onCanvasContextMenu(e) {
		// Show the menu over canvas + cards. Skip only when the user is right-clicking
		// inside an active editor (textarea/input) or on a sticky note (which has its own × button).
		if (e.target.closest('textarea, input, .sticky-note')) return;
		e.preventDefault();
		const canvas = screenToCanvas(e.clientX, e.clientY);
		contextMenu = {
			open: true,
			x: e.clientX,
			y: e.clientY,
			canvasX: canvas.x,
			canvasY: canvas.y
		};
	}

	function closeContextMenu() {
		if (contextMenu.open) contextMenu = { ...contextMenu, open: false };
	}

	function spawnNoteFromMenu() {
		const id = `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		stickyNotes = [
			...stickyNotes,
			{
				id,
				content: '',
				attachedTo: 'canvas',
				x: Math.round(contextMenu.canvasX - 90),
				y: Math.round(contextMenu.canvasY - 80)
			}
		];
		persistNotes();
		closeContextMenu();
	}

	/** Svelte action: attach anvaka/panzoom to the wrapped element. */
	function panzoomAction(node) {
		pzInstance = panzoom(node, {
			maxZoom: 3,
			minZoom: 0.2,
			zoomDoubleClickSpeed: 1,
			smoothScroll: false,
			// Skip pan when mousedown is on an interactive child, a property card, or a sticky note.
			beforeMouseDown: (e) =>
				e.target.closest('button, a, input, form, label, select, textarea, .property-card, .sticky-note') !== null
		});
		return {
			destroy() {
				pzInstance?.dispose();
				pzInstance = null;
			}
		};
	}

	function zoomAtCenter(factor) {
		if (!pzInstance || !viewportEl) return;
		const r = viewportEl.getBoundingClientRect();
		pzInstance.smoothZoom(r.width / 2, r.height / 2, factor);
	}
	function zoomReset() {
		if (!pzInstance) return;
		pzInstance.zoomAbs(0, 0, 1);
		pzInstance.moveTo(0, 0);
	}

	const propertyTypeIcon = (t) => {
		switch (t) {
			case 'land': return TreePine;
			case 'commercial': return Building2;
			case 'mixed': return Layers;
			default: return HomeIcon;
		}
	};

	const propertyStats = (p) => {
		const total = p.units.length;
		const occupied = p.units.filter((u) => u.rentee_id).length;
		const totalRent = p.units.reduce((s, u) => s + (Number(u.rentamount) || 0), 0);
		return { total, occupied, vacant: total - occupied, totalRent };
	};

	const fmtMoney = (n) => n == null
		? '—'
		: new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n);
	const fmtDate = (d) => {
		if (!d) return '—';
		try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
	};

	const tenantBadge = (slug) => ({
		'kubeira-family':    { label: 'Kubeira Family',    dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900' },
		'kubeira-holdings':  { label: 'Kubeira Holdings',  dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900' },
		'kubeira-it-park':   { label: 'Kubeira IT Park',   dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900' },
		'vishwara-holdings': { label: 'Vishwara Holdings', dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900' }
	})[slug] || { label: slug, dot: 'bg-slate-400', chip: 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700' };
</script>

<svelte:head>
	<title>Manager — KH Rentals</title>
</svelte:head>

<div class="dark">
<div class="-m-3 min-h-screen bg-slate-950 p-3 text-slate-100 sm:-m-4 sm:p-4 md:-m-6 md:p-6 lg:-m-8 lg:p-8">
	{#if !selectedProperty}
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">Manager</h1>
				<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{realm.length} {realm.length === 1 ? 'property' : 'properties'} across active tenants</p>
			</div>
		</div>
	{/if}

	{#if form?.ok}
		<div class="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
			<span class="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>
			<div>
				{#if form.action === 'enterReading'}Reading logged · {form.consumed} units · LKR {form.calculatedBill}.
				{:else if form.action === 'sendInvoice'}Invoice generated · {fmtMoney(form.totalamount)}.
				{:else}Done.
				{/if}
			</div>
		</div>
	{/if}
	{#if form?.error}
		<div class="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
			<span class="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">!</span>
			<div>{form.error}</div>
		</div>
	{/if}

	{#if !selectedProperty}
		<!-- Pan/zoom + reset controls -->
		<div class="mb-2 flex items-center justify-between gap-2">
			<p class="text-[11px] uppercase tracking-wide text-slate-500">drag empty space to pan · drag a card to reposition · wheel to zoom</p>
			<div class="flex items-center gap-1.5">
				<button type="button" onclick={resetLayout} class="zoom-btn !w-auto !px-2.5 text-[11px] font-semibold uppercase tracking-wide" title="Reset card positions">Reset layout</button>
				<button type="button" onclick={() => zoomAtCenter(2)} class="zoom-btn" title="Zoom in"><Plus class="h-4 w-4" /></button>
				<button type="button" onclick={() => zoomAtCenter(0.5)} class="zoom-btn" title="Zoom out"><Minus class="h-4 w-4" /></button>
				<button type="button" onclick={zoomReset} class="zoom-btn" title="Reset zoom"><Maximize2 class="h-4 w-4" /></button>
			</div>
		</div>

		<!-- Pannable viewport: drag empty space to pan, wheel to zoom, right-click for menu -->
		<div
			bind:this={viewportEl}
			class="canvas-viewport"
			oncontextmenu={onCanvasContextMenu}
			role="presentation"
		>
		<!-- World layer — large enough to roam in -->
		<div use:panzoomAction class="card-canvas">
			{#each realm as property, idx (property.id)}
				{@const stats = propertyStats(property)}
				{@const Icon = propertyTypeIcon(property.propertytype)}
				{@const badge = tenantBadge(property.tenant_slug)}
				{@const variant = property.units.length === 0
					? 'empty'
					: property.units.length === 1
						? 'single'
						: 'multi'}
				{@const sole = variant === 'single' ? property.units[0] : null}
				{@const tokenRows = Math.ceil(property.units.length / 2)}
				{@const pos = cardPositions[property.id] || defaultPos(idx)}

				<button
					type="button"
					onclick={() => (selectedPropertyId = property.id)}
					onmousedown={(e) => onCardMouseDown(e, property.id)}
					data-property-id={property.id}
					class="property-card group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left shadow-md transition hover:border-slate-700 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
						{variant === 'empty' ? 'card-empty' : ''}
						{variant === 'single' ? 'card-single' : ''}
						{variant === 'multi' ? 'card-multi' : ''}"
					style={`position: absolute; left: ${pos.x}px; top: ${pos.y}px; ${variant === 'multi' ? `--token-rows:${tokenRows};` : ''}`}
				>
					<!-- Header -->
					<div class="flex items-start justify-between gap-3 {variant === 'empty' ? 'border-b border-slate-800 p-3' : 'p-4'}">
						<div class="flex min-w-0 items-start gap-3">
							<div class="flex {variant === 'empty' ? 'h-8 w-8' : 'h-10 w-10'} flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
								<Icon class={variant === 'empty' ? 'h-4 w-4' : 'h-5 w-5'} />
							</div>
							<div class="min-w-0">
								<h2 class="truncate {variant === 'empty' ? 'text-sm' : 'text-base'} font-semibold text-slate-100">{property.name}</h2>
								<div class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 {badge.chip}">
									<span class="h-1.5 w-1.5 rounded-full {badge.dot}"></span>
									{badge.label}
								</div>
							</div>
						</div>
						<ArrowRight class="h-4 w-4 flex-shrink-0 text-slate-600 transition group-hover:text-slate-400" />
					</div>

					{#if variant !== 'empty'}
						<!-- Estate utility bills strip -->
						<div class="flex items-center justify-between gap-1 border-y border-slate-800 bg-slate-950/40 px-4 py-2">
							{#each [
								{ Icon: Zap, label: 'Electricity', tint: 'text-amber-400' },
								{ Icon: Droplets, label: 'Water', tint: 'text-sky-400' },
								{ Icon: Wifi, label: 'SLT', tint: 'text-emerald-400' }
							] as bill}
								<span class="utility-chip" title={`${bill.label} · no bill recorded`}>
									<bill.Icon class="h-3.5 w-3.5 {bill.tint}" />
									<span class="ml-1 text-[10px] uppercase tracking-wide text-slate-500">—</span>
								</span>
							{/each}
						</div>
					{/if}

					{#if variant === 'empty'}
						<!-- Compact: just a label -->
						<div class="px-3 py-2 text-[11px] italic text-slate-500">no units recorded</div>

					{:else if variant === 'single'}
						<!-- Showcase the sole tenant -->
						<div class="flex flex-1 flex-col gap-3 p-5">
							{#if property.description}
								<p class="line-clamp-2 text-xs text-slate-400">{property.description}</p>
							{/if}
							<div class="flex flex-1 items-center gap-4 rounded-xl bg-slate-800/60 p-4">
								<div class="unit-token unit-token-xl {sole.rentee_id ? 'occupied' : 'vacant'}">
									<User class="h-9 w-9" />
								</div>
								<div class="min-w-0 flex-1">
									{#if sole.rentee_name}
										<p class="truncate text-lg font-semibold text-slate-100">{sole.rentee_name}</p>
										{#if sole.rentee_nic}<p class="text-xs text-slate-400">NIC · {sole.rentee_nic}</p>{/if}
										{#if sole.rentee_phone}<p class="mt-0.5 text-xs text-slate-400">☎ {sole.rentee_phone}</p>{/if}
									{:else}
										<p class="text-base italic text-slate-500">vacant</p>
									{/if}
									<p class="mt-2 text-[11px] uppercase tracking-wide text-slate-500">Unit · {sole.unitnumber}</p>
								</div>
							</div>
							<div class="mt-auto flex items-end justify-between pt-1">
								<span class="text-[11px] uppercase tracking-wide text-slate-500">
									{sole.rentee_id ? 'occupied' : 'vacant'}
								</span>
								<span class="font-mono text-base font-semibold tabular-nums text-slate-100">
									{fmtMoney(stats.totalRent)}
								</span>
							</div>
						</div>

					{:else}
						<!-- Multi: 2-column unit token grid -->
						<div class="flex flex-1 flex-col gap-3 p-5">
							{#if property.description}
								<p class="line-clamp-2 text-xs text-slate-400">{property.description}</p>
							{/if}
							<div class="grid grid-cols-2 gap-2">
								{#each property.units as unit (unit.id)}
									<div class="flex items-center justify-center rounded-lg bg-slate-800/40 py-2">
										<div
											class="unit-token {unit.rentee_id ? 'occupied' : 'vacant'}"
											title={`${unit.unitnumber}${unit.rentee_name ? ` · ${unit.rentee_name}` : ' · vacant'}`}
										>
											<User class="h-5 w-5" />
										</div>
									</div>
								{/each}
							</div>
							<div class="mt-auto flex items-end justify-between pt-2">
								<span class="text-[11px] uppercase tracking-wide text-slate-500">
									{stats.occupied}/{stats.total} occupied
								</span>
								<span class="font-mono text-base font-semibold tabular-nums text-slate-100">
									{fmtMoney(stats.totalRent)}
								</span>
							</div>
						</div>
					{/if}
				</button>
			{/each}

			<!-- Sticky notes (positioned in canvas coords; if attached, follow the card) -->
			{#each stickyNotes as note (note.id)}
				{@const abs = noteAbsolutePos(note)}
				<div
					class="sticky-note"
					style={`left: ${abs.x}px; top: ${abs.y}px;${note.width ? ` width: ${note.width}px;` : ''}${note.height ? ` height: ${note.height}px;` : ''} transform: rotate(${noteRotation(note.id)}deg);`}
					onmousedown={(e) => onNoteMouseDown(e, note.id)}
					use:resizableNote={note.id}
					role="presentation"
				>
					<button
						type="button"
						class="sticky-close"
						title="Delete note"
						onclick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
					>
						<X class="h-3 w-3" />
					</button>
					<textarea
						class="sticky-textarea"
						placeholder="Note…"
						value={note.content}
						oninput={(e) => updateNoteContent(note.id, e.currentTarget.value)}
					></textarea>
					{#if note.attachedTo !== 'canvas'}
						<span class="sticky-pin" title="Pinned to property">📌</span>
					{/if}
				</div>
			{/each}
		</div>
		</div><!-- /canvas-viewport -->

		{#if contextMenu.open}
			<button
				type="button"
				class="fixed inset-0 z-40 cursor-default"
				aria-label="Close menu"
				onclick={closeContextMenu}
				oncontextmenu={(e) => { e.preventDefault(); closeContextMenu(); }}
			></button>
			<div
				class="ctx-menu"
				style={`left: ${contextMenu.x}px; top: ${contextMenu.y}px;`}
				role="menu"
			>
				<button type="button" class="ctx-item" onclick={spawnNoteFromMenu}>
					<StickyNote class="h-4 w-4 text-amber-300" />
					<span>Add sticky note</span>
				</button>
				<div class="ctx-hint">more soon…</div>
			</div>
		{/if}

		{#if realm.length === 0}
			<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
				No properties found. Run the data import or seed properties first.
			</div>
		{/if}
	{:else}
		<!-- Property detail -->
		{@const property = selectedProperty}
		{@const Icon = propertyTypeIcon(property.propertytype)}
		{@const badge = tenantBadge(property.tenant_slug)}

		<button
			type="button"
			onclick={() => (selectedPropertyId = null)}
			class="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
		>
			<ChevronLeft class="h-4 w-4" /> All properties
		</button>

		<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div class="flex items-start gap-3">
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
					<Icon class="h-6 w-6" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50">{property.name}</h1>
					<div class="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 {badge.chip}">
						<span class="h-1.5 w-1.5 rounded-full {badge.dot}"></span>
						{badge.label}
					</div>
					{#if property.description}
						<p class="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{property.description}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Property utility bills (placeholder) -->
		<div class="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each [
				{ key: 'electricity', label: 'Electricity', Icon: Zap, light: 'text-amber-600 bg-amber-50', dark: 'dark:text-amber-300 dark:bg-amber-950/40' },
				{ key: 'water', label: 'Water', Icon: Droplets, light: 'text-sky-600 bg-sky-50', dark: 'dark:text-sky-300 dark:bg-sky-950/40' },
				{ key: 'slt', label: 'SLT / Internet', Icon: Wifi, light: 'text-emerald-600 bg-emerald-50', dark: 'dark:text-emerald-300 dark:bg-emerald-950/40' }
			] as bill}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-lg {bill.light} {bill.dark}">
							<bill.Icon class="h-4 w-4" />
						</div>
						<div class="flex-1">
							<div class="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{bill.label}</div>
							<div class="text-sm italic text-slate-400 dark:text-slate-500">no bill recorded</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Unit grid -->
		{#if property.units.length === 0}
			<div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
				No units recorded for this property yet.
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each property.units as unit (unit.id)}
					<article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-950">
						<header class="mb-3 flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
							<div class="flex items-center gap-2">
								<div class="unit-token {unit.rentee_id ? 'occupied' : 'vacant'} !h-9 !w-9">
									<User class="h-4 w-4" />
								</div>
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{unit.unitnumber}</h3>
							</div>
							<span class="text-[11px] font-medium uppercase tracking-wide {unit.rentee_id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}">
								{unit.rentee_id ? 'occupied' : 'vacant'}
							</span>
						</header>

						<div class="mb-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Resident</span>
								{#if unit.rentee_id}
									<a href="/rentees/{unit.rentee_id}" class="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400">view</a>
								{/if}
							</div>
							{#if unit.rentee_name}
								<p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{unit.rentee_name}</p>
								{#if unit.rentee_nic}<p class="text-xs text-slate-500 dark:text-slate-400">NIC · {unit.rentee_nic}</p>{/if}
							{:else}
								<p class="text-sm italic text-slate-400 dark:text-slate-500">vacant</p>
							{/if}

							<dl class="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
								<dt class="text-slate-500 dark:text-slate-400">Rent</dt>
								<dd class="text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">{fmtMoney(unit.rentamount)}</dd>
								<dt class="text-slate-500 dark:text-slate-400">Deposit</dt>
								<dd class="text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{fmtMoney(unit.depositamount)}</dd>
								{#if unit.latest_reading}
									<dt class="text-slate-500 dark:text-slate-400">Reading</dt>
									<dd class="text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{unit.latest_reading.currentreading} · {fmtDate(unit.latest_reading.readingdate)}</dd>
								{/if}
								{#if unit.latest_invoice}
									<dt class="text-slate-500 dark:text-slate-400">Invoice</dt>
									<dd class="text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{unit.latest_invoice.billingperiod} · {fmtMoney(unit.latest_invoice.totalamount)}</dd>
								{/if}
							</dl>
						</div>

						<div class="flex flex-wrap gap-1.5">
							{#if unit.rentee_phone}
								<a class="action-btn" href="tel:{unit.rentee_phone}" title="Call {unit.rentee_phone}">
									<Phone class="h-3.5 w-3.5" /> Call
								</a>
							{/if}
							{#if unit.rentee_email && !unit.rentee_email.endsWith('@import.local')}
								<a class="action-btn" href="mailto:{unit.rentee_email}">
									<Mail class="h-3.5 w-3.5" /> Mail
								</a>
							{/if}
							{#if unit.rentee_id}
								<form method="POST" action="?/sendInvoice" use:enhance class="inline">
									<input type="hidden" name="unitId" value={unit.id} />
									<input type="hidden" name="propertyId" value={property.id} />
									<input type="hidden" name="renteeId" value={unit.rentee_id} />
									<input type="hidden" name="agreementId" value={unit.agreement_id} />
									<button type="submit" class="action-btn">
										<ScrollText class="h-3.5 w-3.5" /> Invoice
									</button>
								</form>
								<button
									type="button"
									class="action-btn"
									onclick={() => (activeFormUnit = activeFormUnit === unit.id ? null : unit.id)}
								>
									<Zap class="h-3.5 w-3.5" /> Reading
								</button>
								<a class="action-btn" href="/rentees/new?replaces={unit.rentee_id}&unit={unit.id}">
									<UserPlus class="h-3.5 w-3.5" /> Change
								</a>
							{:else}
								<a class="action-btn" href="/rentees/new?unit={unit.id}">
									<UserPlus class="h-3.5 w-3.5" /> Onboard
								</a>
							{/if}
						</div>

						{#if activeFormUnit === unit.id && unit.rentee_id}
							<form
								method="POST"
								action="?/enterReading"
								use:enhance={() => {
									return async ({ update }) => { await update(); activeFormUnit = null; };
								}}
								class="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
							>
								<input type="hidden" name="unitId" value={unit.id} />
								<input type="hidden" name="propertyId" value={property.id} />
								<input type="hidden" name="renteeId" value={unit.rentee_id} />
								<label class="block text-xs font-medium text-slate-600 dark:text-slate-300">
									Current meter (kWh)
									<span class="mt-1 flex gap-2">
										<input
											type="number"
											step="0.01"
											name="currentReading"
											required
											placeholder={unit.latest_reading?.currentreading ?? '0'}
											class="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono tabular-nums focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900"
										/>
										<button type="submit" class="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300">
											Log
										</button>
									</span>
								</label>
								{#if unit.latest_reading}
									<p class="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">prev · {unit.latest_reading.currentreading} on {fmtDate(unit.latest_reading.readingdate)}</p>
								{/if}
							</form>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	{/if}
</div>
</div>

<style>
	.unit-token {
		width: 44px;
		height: 52px;
		border-radius: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: transform 120ms ease, box-shadow 120ms ease;
		cursor: default;
	}
	.unit-token.occupied {
		background: linear-gradient(180deg, #10b981 0%, #047857 100%);
		color: white;
		box-shadow: 0 1px 2px rgba(4, 120, 87, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.18);
	}
	.unit-token.vacant {
		background: linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%);
		color: #64748b;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
		border: 1px solid #cbd5e1;
	}
	.unit-token:hover {
		transform: translateY(-1px) scale(1.05);
		box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
		z-index: 1;
	}

	.unit-token-xl {
		width: 80px;
		height: 96px;
		border-radius: 16px;
	}
	.unit-token-xl :global(svg) {
		width: 36px;
		height: 36px;
	}

	.canvas-viewport {
		position: relative;
		height: calc(100vh - 160px);
		min-height: 500px;
		border: 1px solid #1e293b;
		border-radius: 16px;
		overflow: hidden;
		background:
			radial-gradient(circle at 25% 25%, rgba(56, 189, 248, 0.04) 0%, transparent 40%),
			radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.04) 0%, transparent 40%),
			#020617;
		cursor: grab;
	}
	.canvas-viewport:active { cursor: grabbing; }

	:global(.zoom-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid #334155;
		background: #0f172a;
		color: #e2e8f0;
		cursor: pointer;
		transition: background 100ms ease, border-color 100ms ease;
	}
	:global(.zoom-btn:hover) { background: #1e293b; border-color: #475569; }

	/* Sticky notes */
	.sticky-note {
		position: absolute;
		display: flex;
		flex-direction: column;
		width: 180px;
		height: 160px;
		min-width: 140px;
		min-height: 110px;
		max-width: 600px;
		max-height: 600px;
		padding: 22px 12px 10px;
		background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
		color: #422006;
		border-radius: 4px;
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.25),
			0 6px 16px rgba(0, 0, 0, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.4);
		cursor: grab;
		font-family: 'Caveat', 'Comic Sans MS', cursive;
		z-index: 5;
		resize: both;
		overflow: hidden;
	}
	.sticky-note:active { cursor: grabbing; }
	.sticky-textarea {
		flex: 1;
		width: 100%;
		border: none;
		background: transparent;
		resize: none;
		outline: none;
		font: inherit;
		font-size: 18px;
		color: #422006;
		cursor: text;
	}
	.sticky-textarea::placeholder { color: rgba(66, 32, 6, 0.45); }
	.sticky-close {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 18px;
		height: 18px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: rgba(66, 32, 6, 0.5);
		border-radius: 4px;
		cursor: pointer;
		transition: background 80ms ease, color 80ms ease;
	}
	.sticky-close:hover { background: rgba(66, 32, 6, 0.15); color: #422006; }
	.sticky-pin {
		position: absolute;
		top: -8px;
		left: 8px;
		font-size: 14px;
	}

	/* Right-click context menu */
	.ctx-menu {
		position: fixed;
		z-index: 50;
		min-width: 180px;
		padding: 4px;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 8px;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
		font-family: system-ui, sans-serif;
	}
	.ctx-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: #e2e8f0;
		font-size: 13px;
		font-weight: 500;
		text-align: left;
		cursor: pointer;
	}
	.ctx-item:hover { background: #1e293b; }
	.ctx-hint {
		padding: 6px 10px;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #64748b;
	}

	/* Free-positioned cards on the canvas */
	.card-canvas {
		position: relative;
		width: 4000px;
		height: 3000px;
	}

	.property-card {
		width: 320px;
		aspect-ratio: 5 / 7;
		cursor: grab;
	}
	.property-card:active { cursor: grabbing; }

	.card-empty { width: 280px; aspect-ratio: 5 / 7; }
	.card-single { width: 360px; aspect-ratio: 5 / 7; }
	.card-multi {
		width: 320px;
		aspect-ratio: auto;
		min-height: calc(220px + var(--token-rows, 1) * 52px);
	}

	.utility-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 4px 6px;
		border-radius: 6px;
		background: rgba(15, 23, 42, 0.6);
		border: 1px solid rgba(51, 65, 85, 0.6);
		transition: background 100ms ease;
	}
	.property-card:hover .utility-chip { background: rgba(15, 23, 42, 0.8); }

	:global(.dark) .unit-token.occupied {
		background: linear-gradient(180deg, #059669 0%, #064e3b 100%);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.10);
	}
	:global(.dark) .unit-token.vacant {
		background: linear-gradient(180deg, #334155 0%, #1e293b 100%);
		color: #94a3b8;
		border-color: #475569;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	:global(.action-btn) {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border-radius: 8px;
		border: 1px solid #e2e8f0;
		background: white;
		color: #0f172a;
		font-size: 11px;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: background 100ms ease, border-color 100ms ease, transform 100ms ease;
	}
	:global(.action-btn:hover) {
		background: #f8fafc;
		border-color: #cbd5e1;
		transform: translateY(-1px);
	}
	:global(.action-btn:active) {
		transform: translateY(0);
	}

	:global(.dark .action-btn) {
		background: #0f172a;
		border-color: #334155;
		color: #e2e8f0;
	}
	:global(.dark .action-btn:hover) {
		background: #1e293b;
		border-color: #475569;
	}
</style>
