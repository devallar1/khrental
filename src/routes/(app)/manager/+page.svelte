<script>
	import { enhance } from '$app/forms';
	import toast from 'svelte-french-toast';
	import {
		Phone, Mail, ScrollText, Zap, Droplets, Wifi,
		User, UserPlus, UserMinus, Home as HomeIcon,
		ChevronLeft, Building2, TreePine, Layers, ArrowRight,
		Plus, Minus, Maximize2, StickyNote, X,
		RotateCw, Copy, MapPin, Landmark, Wrench, Bell, Edit3, Archive, History,
		Group, Palette, Wallet, AlertTriangle, ChevronDown, Receipt
	} from 'lucide-svelte';
	import panzoom from 'panzoom';
	import PropertyMap from '$lib/components/PropertyMap.svelte';
	import ManagerRightRail from '$lib/components/ManagerRightRail.svelte';
	import ContactBook from '$lib/components/ContactBook.svelte';
	import BillingConfigEditor from '$lib/components/BillingConfigEditor.svelte';

	const hasCoords = (p) => p && p.latitude != null && p.longitude != null;

	// Which manager-side panel is open. null = none.
	let activePanel = $state(null);
	// One-shot route hint passed into ContactBook on open (e.g. "open the
	// wizard pre-filled to this unit" or "edit this rentee"). Cleared when
	// the panel closes so the next open starts at the list.
	let contactBookContext = $state(null);

	function openContactsForUnit(propertyId, unitId, rentee) {
		if (rentee?.id) {
			contactBookContext = { type: 'editIdentity', renteeId: rentee.id };
		} else {
			contactBookContext = { type: 'wizard', propertyId, unitId };
		}
		activePanel = 'contacts';
	}

	// Right-click-style popover anchored to a unit token. Three actions:
	//   occupied → Edit / Remove
	//   vacant   → Add
	let tokenMenu = $state({
		open: false,
		x: 0,
		y: 0,
		propertyId: '',
		unitId: '',
		rentee: null // { id, name } | null
	});

	function openTokenMenu(e, propertyId, unitId, rentee) {
		// Clamp so the popover doesn't overflow the right/bottom of the
		// viewport; small margin lets the dismissal backdrop stay clickable.
		// H allows for the bank-account section (one row per profile + clear).
		const PAD = 8;
		const W = 260;
		const H = 360;
		const x = Math.min(e.clientX, window.innerWidth - W - PAD);
		const y = Math.min(e.clientY, window.innerHeight - H - PAD);
		tokenMenu = { open: true, x, y, propertyId, unitId, rentee: rentee || null };
		bankExpanded = false;
	}

	function closeTokenMenu() {
		if (tokenMenu.open) tokenMenu = { ...tokenMenu, open: false };
		bankExpanded = false;
	}

	// Bank-account section starts collapsed (just the routed profile is
	// shown). Clicking it expands the full list. Reset whenever the menu
	// opens or closes so each new menu open starts collapsed again.
	let bankExpanded = $state(false);

	// Currently-open menu's unit + the bank profiles eligible for it (same
	// tenant org as the unit's property). Derived so the menu reflects the
	// latest server-validated state after each setBankProfile submit.
	const tokenMenuContext = $derived.by(() => {
		if (!tokenMenu.open) return null;
		const property = (data.realm || []).find((p) => p.id === tokenMenu.propertyId);
		const unit = property?.units?.find((u) => u.id === tokenMenu.unitId);
		if (!property || !unit) return null;
		const profiles = (data.bankProfiles || []).filter((bp) => bp.org_id === property.org_id);
		return {
			currentBankProfileId: unit.bank_profile_id || null,
			currentBankProfileLabel: unit.bank_profile_label || null,
			profiles
		};
	});

	function tokenMenuAdd() {
		const { propertyId, unitId } = tokenMenu;
		closeTokenMenu();
		openContactsForUnit(propertyId, unitId, null);
	}
	function tokenMenuEdit() {
		const { propertyId, unitId, rentee } = tokenMenu;
		closeTokenMenu();
		openContactsForUnit(propertyId, unitId, rentee);
	}

	// "Edit billing" panel — slides in alongside the contact book.
	let billingEditContext = $state(null);
	function tokenMenuEditBilling() {
		const { propertyId, unitId, rentee } = tokenMenu;
		closeTokenMenu();
		const property = (data.realm || []).find((p) => p.id === propertyId);
		const unit = property?.units?.find((u) => u.id === unitId);
		if (!unit?.agreement_id) return;
		billingEditContext = {
			agreementId: unit.agreement_id,
			currentConfig: unit.billing_config || null,
			currentMeterReadings: unit.billing_meter_readings || null,
			context: {
				renteeName: rentee?.name || unit.tenant_name || null,
				unitNumber: unit.unitnumber || null,
				propertyName: property?.name || null
			}
		};
		activePanel = 'billing';
	}

	// Custom confirm modal — replaces native confirm() for destructive
	// actions like Remove tenant. State holds everything needed to render
	// the modal and the form that fires on Confirm.
	let confirmDialog = $state(null);

	function openRemoveConfirm() {
		const { unitId, rentee } = tokenMenu;
		closeTokenMenu();
		confirmDialog = {
			kind: 'endTenancy',
			title: 'Remove tenant',
			message: `Remove ${rentee?.name || 'this tenant'} from the unit? The agreement will be marked terminated.`,
			confirmLabel: 'Remove tenant',
			unitId
		};
	}
	function closeConfirmDialog() {
		confirmDialog = null;
	}

	let { data, form } = $props();

	// Toast on action result. Each form action returns a fresh object so
	// $effect re-runs on every submission. Action-aware messages where we
	// have something useful to say; generic "Done." otherwise.
	$effect(() => {
		if (!form) return;
		if (form.error) {
			toast.error(form.error);
			return;
		}
		if (!form.ok) return;
		switch (form.action) {
			case 'enterReading':
				toast.success(`Reading logged · ${form.consumed} units · LKR ${form.calculatedBill}.`);
				break;
			case 'sendInvoice':
				toast.success(`Invoice generated · ${fmtMoney(form.totalamount)}.`);
				break;
			case 'setBankProfile':
				toast.success('Bank account updated');
				break;
			case 'endTenancy':
				toast.success('Tenant removed');
				break;
			default:
				toast.success('Done');
		}
	});

	const realm = $derived(data.realm || []);

	// Properties ordered for the mobile stack: real properties first (server's
	// tenant/name order preserved), placeholders like "Unassigned (Manual
	// review)" at the bottom.
	const sortedRealm = $derived.by(() => {
		const isUnassigned = (p) => /unassigned/i.test(p?.name || '');
		const out = [...realm];
		out.sort((a, b) => {
			const ua = isUnassigned(a);
			const ub = isUnassigned(b);
			if (ua !== ub) return ua ? 1 : -1;
			return 0;
		});
		return out;
	});

	// Tracked viewport. Desktop canvas (panzoom + free positioning) doesn't
	// work on phones — at <= 768px we render a vertical card stack instead.
	let isMobile = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(max-width: 768px)');
		isMobile = mq.matches;
		const onChange = (e) => { isMobile = e.matches; };
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	// Shared canvas-state sync. Server is authoritative; localStorage is a
	// warm cache + offline fallback. See migration 20260430_02 + the API at
	// /api/manager/canvas.
	let lastServerUpdatedAt = $state(data.canvasUpdatedAt || null);
	let canvasSaveTimer = null;
	let suppressSavesUntil = 0;
	let canvasChannel = null;

	// Live cursor presence — see /api/manager/presence and lib/server/presence.js.
	let presenceCursors = $state({});  // { [userId]: { name, color, x, y } }
	let presenceSelfId = null;
	let presenceES = null;
	let presenceLastSentAt = 0;
	let presenceLastPos = null;
	let presenceIdleTimer = null;
	const PRESENCE_THROTTLE_MS = 50;          // 20 Hz max while moving
	const PRESENCE_IDLE_HEARTBEAT_MS = 1800;  // ping while idle so we don't expire

	let selectedPropertyId = $state(null);
	const selectedProperty = $derived(realm.find((p) => p.id === selectedPropertyId) || null);
	let activeFormUnit = $state(null);

	const totalRentees = $derived.by(() => {
		const ids = new Set();
		for (const p of realm) for (const u of p.units) if (u.tenant_id) ids.add(u.tenant_id);
		return ids.size;
	});

	// Per-card flip state — { [propertyId]: true } means showing the back
	let flippedCards = $state({});
	let copiedFlash = $state(null); // brief "copied!" badge state

	function toggleFlip(propertyId, e) {
		e?.stopPropagation();
		e?.preventDefault();
		flippedCards = { ...flippedCards, [propertyId]: !flippedCards[propertyId] };
	}

	async function copyToClipboard(text, key, e) {
		e?.stopPropagation();
		e?.preventDefault();
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copiedFlash = key;
			setTimeout(() => { if (copiedFlash === key) copiedFlash = null; }, 1200);
		} catch {}
	}

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
		// Server first — falls back to localStorage if server is empty.
		const fromServer = data.canvasState?.cardPositions;
		let stored = {};
		if (fromServer && typeof fromServer === 'object') {
			stored = fromServer;
		} else {
			try { stored = JSON.parse(localStorage.getItem(POS_KEY) || '{}'); } catch {}
		}
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
		const fromServer = data.canvasState?.stickyNotes;
		if (Array.isArray(fromServer)) {
			stickyNotes = fromServer;
		} else {
			try { stickyNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'); } catch { stickyNotes = []; }
		}
		notesInitialized = true;
	});

	function persistNotes() {
		try { localStorage.setItem(NOTES_KEY, JSON.stringify(stickyNotes)); } catch {}
		debouncedSaveCanvas();
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
		if (e.target.closest('button, a, input, form, label, select, textarea, .sticky-note')) return;
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
		if (dragState.type === 'district-resize') {
			const newW = Math.max(220, dragState.startW + dx / dragState.scale);
			const newH = Math.max(160, dragState.startH + dy / dragState.scale);
			districts = districts.map((d) => (d.id === dragState.id ? { ...d, width: newW, height: newH } : d));
			return;
		}
		const newX = dragState.startX + dx / dragState.scale;
		const newY = dragState.startY + dy / dragState.scale;
		if (dragState.type === 'card') {
			cardPositions = { ...cardPositions, [dragState.id]: { x: newX, y: newY } };
		} else if (dragState.type === 'district') {
			districts = districts.map((d) => (d.id === dragState.id ? { ...d, x: newX, y: newY } : d));
			// Drag the cards that were inside at drag-start along with the district
			const deltaX = newX - dragState.startX;
			const deltaY = newY - dragState.startY;
			if (dragState.insideIds && dragState.insideIds.length) {
				const next = { ...cardPositions };
				for (const cid of dragState.insideIds) {
					const sp = dragState.startCardPositions[cid];
					if (sp) next[cid] = { x: sp.x + deltaX, y: sp.y + deltaY };
				}
				cardPositions = next;
			}
		} else {
			// note — while dragging, treat as canvas-positioned
			stickyNotes = stickyNotes.map((n) =>
				n.id === dragState.id ? { ...n, attachedTo: 'canvas', x: newX, y: newY } : n
			);
		}
	}

	function onWindowUp(e) {
		if (!dragState) return;
		const { type, id, moved } = dragState;

		if (moved && type === 'note') {
			// Detect drop on a property card
			const cardEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('.property-card');
			const droppedPropertyId = cardEl?.dataset.propertyId || null;
			if (droppedPropertyId && cardPositions[droppedPropertyId]) {
				const note = stickyNotes.find((n) => n.id === id);
				if (note) {
					const cp = cardPositions[droppedPropertyId];
					stickyNotes = stickyNotes.map((n) =>
						n.id === id ? { ...n, attachedTo: droppedPropertyId, x: note.x - cp.x, y: note.y - cp.y } : n
					);
				}
			}
			persistNotes();
		}
		if (moved && type === 'card') {
			persistCardPositions();
		}
		if (moved && (type === 'district' || type === 'district-resize')) {
			persistDistricts();
			// District move also displaces cards — persist their new positions.
			if (type === 'district' && dragState.insideIds?.length) {
				persistCardPositions();
			}
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
		// Push the reset layout to the server too so other open instances pick it up.
		debouncedSaveCanvas();
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

	// ---- Districts (labeled regions on the canvas) ----------------------
	const DISTRICTS_KEY = 'manager_districts';
	const DISTRICT_COLORS = ['aqua', 'rose', 'emerald', 'amber'];
	let districts = $state([]);
	let districtsInitialized = false;

	$effect(() => {
		if (districtsInitialized) return;
		const fromServer = data.canvasState?.districts;
		if (Array.isArray(fromServer)) {
			districts = fromServer;
		} else {
			try { districts = JSON.parse(localStorage.getItem(DISTRICTS_KEY) || '[]'); } catch { districts = []; }
		}
		districtsInitialized = true;
	});

	function persistDistricts() {
		try { localStorage.setItem(DISTRICTS_KEY, JSON.stringify(districts)); } catch {}
		debouncedSaveCanvas();
	}

	// Card position writer — mirrors persistNotes/persistDistricts so all
	// three pieces of canvas state push through the same sync path.
	function persistCardPositions() {
		try { localStorage.setItem(POS_KEY, JSON.stringify(cardPositions)); } catch {}
		debouncedSaveCanvas();
	}

	function debouncedSaveCanvas() {
		if (typeof window === 'undefined') return;
		if (Date.now() < suppressSavesUntil) return;
		if (canvasSaveTimer) clearTimeout(canvasSaveTimer);
		canvasSaveTimer = setTimeout(saveCanvasNow, 600);
	}

	async function saveCanvasNow() {
		canvasSaveTimer = null;
		const state = {
			cardPositions: $state.snapshot(cardPositions),
			stickyNotes: $state.snapshot(stickyNotes),
			districts: $state.snapshot(districts)
		};
		try {
			const res = await fetch('/api/manager/canvas', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ state })
			});
			if (!res.ok) return;
			const body = await res.json();
			lastServerUpdatedAt = body.updatedAt;
			try { canvasChannel?.postMessage({ type: 'updated', updatedAt: body.updatedAt }); } catch {}
		} catch {}
	}

	async function refetchCanvas() {
		try {
			const res = await fetch('/api/manager/canvas');
			if (!res.ok) return;
			const body = await res.json();
			if (!body.updatedAt || body.updatedAt === lastServerUpdatedAt) return;
			// Server has newer state — replace local. Briefly suppress saves so
			// the resulting reactivity doesn't echo straight back.
			suppressSavesUntil = Date.now() + 300;
			const s = body.state || {};
			if (s.cardPositions && typeof s.cardPositions === 'object') {
				cardPositions = s.cardPositions;
			}
			if (Array.isArray(s.stickyNotes)) stickyNotes = s.stickyNotes;
			if (Array.isArray(s.districts)) districts = s.districts;
			lastServerUpdatedAt = body.updatedAt;
		} catch {}
	}

	// Cross-tab + window-focus sync. BroadcastChannel covers same-origin tabs
	// instantly; window 'focus' covers tabs that come back from background or
	// from another device.
	$effect(() => {
		if (typeof window === 'undefined') return;
		canvasChannel = ('BroadcastChannel' in window)
			? new BroadcastChannel('khrental-manager-canvas')
			: null;
		if (canvasChannel) {
			canvasChannel.onmessage = (msg) => {
				if (msg.data?.type === 'updated' && msg.data.updatedAt !== lastServerUpdatedAt) {
					refetchCanvas();
				}
			};
		}
		const onFocus = () => refetchCanvas();
		window.addEventListener('focus', onFocus);
		return () => {
			window.removeEventListener('focus', onFocus);
			try { canvasChannel?.close(); } catch {}
			canvasChannel = null;
		};
	});

	function spawnDistrictFromMenu() {
		const id = `dist-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
		const w = 460;
		const h = 320;
		districts = [
			...districts,
			{
				id,
				name: 'New district',
				color: 'aqua',
				x: Math.round(contextMenu.canvasX - w / 2),
				y: Math.round(contextMenu.canvasY - h / 2),
				width: w,
				height: h
			}
		];
		persistDistricts();
		closeContextMenu();
	}

	function deleteDistrict(id) {
		districts = districts.filter((d) => d.id !== id);
		persistDistricts();
	}

	function updateDistrictName(id, name) {
		districts = districts.map((d) => (d.id === id ? { ...d, name } : d));
		persistDistricts();
	}

	function cycleDistrictColor(id) {
		districts = districts.map((d) => {
			if (d.id !== id) return d;
			const idx = DISTRICT_COLORS.indexOf(d.color);
			return { ...d, color: DISTRICT_COLORS[(idx + 1) % DISTRICT_COLORS.length] };
		});
		persistDistricts();
	}

	/** Cards whose center sits inside the given district's bounds. */
	function cardsInsideDistrict(d) {
		const out = [];
		for (const p of realm) {
			const pos = cardPositions[p.id];
			if (!pos) continue;
			const el = document.querySelector(`[data-property-id="${p.id}"]`);
			const w = el?.offsetWidth ?? 320;
			const h = el?.offsetHeight ?? 480;
			const cx = pos.x + w / 2;
			const cy = pos.y + h / 2;
			if (cx >= d.x && cx <= d.x + d.width && cy >= d.y && cy <= d.y + d.height) {
				out.push(p.id);
			}
		}
		return out;
	}

	function onDistrictMouseDown(e, id) {
		if (e.button !== 0) return;
		if (e.target.closest('input, button, [contenteditable], textarea')) return;
		e.stopPropagation();
		const d = districts.find((x) => x.id === id);
		if (!d) return;
		const scale = pzInstance?.getTransform()?.scale ?? 1;
		// Snapshot cards currently inside the district + their start positions
		const insideIds = cardsInsideDistrict(d);
		const startCardPositions = {};
		for (const cid of insideIds) startCardPositions[cid] = { ...cardPositions[cid] };
		dragState = {
			type: 'district',
			id,
			startMouseX: e.clientX,
			startMouseY: e.clientY,
			startX: d.x,
			startY: d.y,
			scale,
			moved: false,
			insideIds,
			startCardPositions
		};
		window.addEventListener('mousemove', onWindowMove);
		window.addEventListener('mouseup', onWindowUp);
	}

	function onDistrictResizeMouseDown(e, id) {
		if (e.button !== 0) return;
		e.stopPropagation();
		e.preventDefault();
		const d = districts.find((x) => x.id === id);
		if (!d) return;
		const scale = pzInstance?.getTransform()?.scale ?? 1;
		dragState = {
			type: 'district-resize',
			id,
			startMouseX: e.clientX,
			startMouseY: e.clientY,
			startW: d.width,
			startH: d.height,
			scale,
			moved: false
		};
		window.addEventListener('mousemove', onWindowMove);
		window.addEventListener('mouseup', onWindowUp);
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
			// Pan inertia: anvaka panzoom's built-in kinetic glide after release.
			smoothScroll: { amplitude: 0.45, minVelocity: 8 },
			// Skip pan when mousedown is on an interactive child, a card, sticky note, or district control.
			beforeMouseDown: (e) =>
				e.target.closest('button, a, input, form, label, select, textarea, .property-card, .sticky-note, .district-header, .district-resize-handle') !== null,
			// Zoom inertia: route every wheel tick through smoothZoom (animated)
			// instead of panzoom's default instant zoom. Pivot from the cursor —
			// coordinates must be in the viewport's (owner's) coord space, NOT
			// the panzoomed element's rect (which shifts with the transform and
			// causes the focal point to drift along the panned axis).
			beforeWheel: (e) => {
				e.preventDefault();
				const r = viewportEl?.getBoundingClientRect();
				if (!r) return true;
				const x = e.clientX - r.left;
				const y = e.clientY - r.top;
				// MacBook trackpads send pixel-mode deltas (small numbers per
				// gesture frame). Mouse wheels send line-mode (multiply ×100 to
				// match the pixel scale). Sensitivity factor was 0.0015 — too
				// low especially on trackpad — bumped to ~0.004 so each tick
				// produces a clearly visible zoom step.
				const linePx = e.deltaMode > 0 ? 100 : 1;
				const delta = e.deltaY * linePx;
				const scaleMultiplier = Math.exp(-delta * 0.004);
				pzInstance.smoothZoom(x, y, scaleMultiplier);
				return true; // cancel the default instant zoom
			}
		});
		// Camera-parallax CSS vars used to be pushed here for ambient gradients
		// in the viewport background. Those gradients were removed — they were
		// causing CPU rasterization on every pan frame — so no transform
		// listener is needed any more.
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
		smoothFlyTo(80, 80, 1);
	}

	/**
	 * Animate the canvas transform from current (x, y, scale) to target.
	 * anvaka panzoom doesn't have a built-in fly-to, so we drive both
	 * translate + scale with rAF. zoomAbs(0,0,scale) sets the scale then
	 * we override the translate via moveTo.
	 */
	let flyRaf = null;
	function smoothFlyTo(tx, ty, scale, duration = 480) {
		if (!pzInstance) return;
		if (flyRaf) cancelAnimationFrame(flyRaf);
		const start = pzInstance.getTransform();
		const sx = start.x, sy = start.y, ss = start.scale;
		const t0 = performance.now();
		const tick = () => {
			const elapsed = performance.now() - t0;
			const t = Math.min(elapsed / duration, 1);
			const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
			const ns = ss + (scale - ss) * e;
			const nx = sx + (tx - sx) * e;
			const ny = sy + (ty - sy) * e;
			pzInstance.zoomAbs(0, 0, ns);
			pzInstance.moveTo(nx, ny);
			if (t < 1) flyRaf = requestAnimationFrame(tick);
			else flyRaf = null;
		};
		flyRaf = requestAnimationFrame(tick);
	}

	/** Center a card in the viewport at a higher zoom level. */
	function focusCard(propertyId) {
		if (!pzInstance || !viewportEl) return;
		const pos = cardPositions[propertyId];
		const el = document.querySelector(`[data-property-id="${propertyId}"]`);
		if (!pos || !el) return;
		const w = el.offsetWidth;
		const h = el.offsetHeight;
		const vp = viewportEl.getBoundingClientRect();
		const targetScale = 1.4;
		const tx = vp.width / 2 - (pos.x + w / 2) * targetScale;
		const ty = vp.height / 2 - (pos.y + h / 2) * targetScale;
		smoothFlyTo(tx, ty, targetScale);
	}

	/**
	 * Update CSS vars on the viewport for the mouse-following spotlight.
	 * Bypasses Svelte reactivity since this fires at 60+Hz.
	 *  --mouse-x / --mouse-y  = cursor in viewport-screen pixels
	 *  --cam-x / --cam-y      = panzoom transform (camera offset)
	 *  --cam-scale            = panzoom zoom factor
	 */
	// onViewportMouseMove is rAF-throttled: native mousemove can fire at
	// 60–120Hz on hi-rate trackpads, and this handler triggers a repaint of
	// the canvas-viewport's multi-radial-gradient backdrop on every CSS-var
	// change. Coalescing to 60fps removes the extra paint pressure without
	// any visible smoothness change.
	let pendingMouseEvent = null;
	let mouseRaf = 0;

	function flushMouseMove() {
		mouseRaf = 0;
		const e = pendingMouseEvent;
		pendingMouseEvent = null;
		if (!e || !viewportEl) return;

		const r = viewportEl.getBoundingClientRect();
		const localX = e.clientX - r.left;
		const localY = e.clientY - r.top;
		viewportEl.style.setProperty('--mouse-x', `${localX}px`);
		viewportEl.style.setProperty('--mouse-y', `${localY}px`);
		const overCard = e.target?.closest?.('.property-card');
		viewportEl.style.setProperty('--spot-size', overCard ? '520px' : '160px');
		// --cam-* are already kept in sync by panzoom's `transform` listener
		// (see panzoomAction). Re-writing them on every mousemove forced the
		// camera-parallax radial gradients to repaint for no reason.

		// Presence — already throttled to 20Hz internally.
		const world = screenToCanvas(e.clientX, e.clientY);
		sendPresenceCursor(world.x, world.y);
	}

	function onViewportMouseMove(e) {
		pendingMouseEvent = e;
		if (mouseRaf) return;
		mouseRaf = requestAnimationFrame(flushMouseMove);
	}

	// ---- Live cursor presence ---------------------------------------------
	function sendPresenceCursor(x, y, force = false) {
		if (typeof window === 'undefined') return;
		const now = Date.now();
		if (!force && now - presenceLastSentAt < PRESENCE_THROTTLE_MS) return;
		presenceLastSentAt = now;
		presenceLastPos = { x, y };
		try {
			fetch('/api/manager/presence', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ x, y }),
				keepalive: true
			}).catch(() => {});
		} catch {}
	}

	function schedulePresenceHeartbeat() {
		if (presenceIdleTimer) clearTimeout(presenceIdleTimer);
		presenceIdleTimer = setTimeout(() => {
			if (presenceLastPos) sendPresenceCursor(presenceLastPos.x, presenceLastPos.y, true);
			schedulePresenceHeartbeat();
		}, PRESENCE_IDLE_HEARTBEAT_MS);
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		presenceES = new EventSource('/api/manager/presence');
		presenceES.addEventListener('hello', (ev) => {
			try { presenceSelfId = JSON.parse(ev.data)?.userId || null; } catch {}
		});
		presenceES.onmessage = (ev) => {
			try {
				const msg = JSON.parse(ev.data);
				if (msg.type === 'cursor') {
					if (msg.userId === presenceSelfId) return;
					presenceCursors = {
						...presenceCursors,
						[msg.userId]: { name: msg.name, color: msg.color, x: msg.x, y: msg.y }
					};
				} else if (msg.type === 'bye') {
					const { [msg.userId]: _gone, ...rest } = presenceCursors;
					presenceCursors = rest;
				}
			} catch {}
		};
		presenceES.onerror = () => {
			// EventSource auto-reconnects; nothing to do here.
		};

		schedulePresenceHeartbeat();

		const sayBye = () => {
			try {
				const blob = new Blob([JSON.stringify({ bye: true })], { type: 'application/json' });
				navigator.sendBeacon?.('/api/manager/presence', blob);
			} catch {}
		};
		window.addEventListener('beforeunload', sayBye);
		window.addEventListener('pagehide', sayBye);

		return () => {
			window.removeEventListener('beforeunload', sayBye);
			window.removeEventListener('pagehide', sayBye);
			if (presenceIdleTimer) clearTimeout(presenceIdleTimer);
			try { presenceES?.close(); } catch {}
			presenceES = null;
			sayBye();
		};
	});

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
		const occupied = p.units.filter((u) => u.tenant_id).length;
		const totalRent = p.units.reduce((s, u) => s + (Number(u.rentamount) || 0), 0);
		return { total, occupied, vacant: total - occupied, totalRent };
	};

	const fmtMoney = (n) => n == null
		? '—'
		: new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n);
	// Sri Lanka local date format: DD/MM/YYYY.
	const fmtDate = (d) => {
		if (!d) return '—';
		try {
			const date = new Date(d);
			if (Number.isNaN(date.getTime())) return String(d);
			const dd = String(date.getDate()).padStart(2, '0');
			const mm = String(date.getMonth() + 1).padStart(2, '0');
			return `${dd}/${mm}/${date.getFullYear()}`;
		} catch { return String(d); }
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
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Fredoka:wght@500;600;700&display=swap" />
</svelte:head>

<div class="dark aqua-theme">
<div
	class={`-m-3 min-h-screen p-3 sm:-m-4 sm:p-4 md:-m-6 md:p-6 lg:-m-8 lg:p-8 ${selectedProperty ? '' : 'md:pr-16 lg:pr-16'}`}
	style="background: var(--bg); color: var(--ink); font-family: 'Inter Tight', system-ui, sans-serif;"
>
	{#if !selectedProperty}
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h1 class="page-title text-2xl font-bold sm:text-3xl">Manager</h1>
				<p class="mt-1 text-sm" style="color: var(--ink-3);">
					<span class="aqua-dot mr-1" style="vertical-align: middle;"></span>
					{realm.length} {realm.length === 1 ? 'property' : 'properties'} across active tenants
					with {totalRentees} {totalRentees === 1 ? 'rentee' : 'rentees'}
				</p>
			</div>
		</div>
	{/if}

	{#if !selectedProperty}
		{#if isMobile}
			<!-- Mobile: vertical card stack. Tap a card to open its detail page.
			     Unassigned/placeholder properties are pushed to the bottom. -->
			<div class="mobile-stack">
				{#each sortedRealm as property (property.id)}
					{@const stats = propertyStats(property)}
					{@const Icon = propertyTypeIcon(property.propertytype)}
					{@const badge = tenantBadge(property.org_slug)}
					<button
						type="button"
						class="mobile-card"
						onclick={() => (selectedPropertyId = property.id)}
					>
						<div class="mobile-card-banner">
							{#if hasCoords(property)}
								<PropertyMap
									lat={Number(property.latitude)}
									lng={Number(property.longitude)}
									height={120}
									boundary={property.boundary_geojson}
									hoverParent=".mobile-card"
								/>
							{:else}
								<div class="mobile-card-icon">
									<Icon class="h-8 w-8" />
								</div>
							{/if}
						</div>
						<div class="mobile-card-body">
							<div class="mobile-card-header">
								<span class="tenant-chip" data-slug={property.org_slug}>{badge.label}</span>
								<h2 class="mobile-card-title">{property.name}</h2>
							</div>
							<div class="mobile-card-footer">
								<div class="mobile-card-stats">
									<span class="mono-num">{stats.occupied}/{stats.total}</span>
									<span>{stats.total === 1 ? 'unit' : 'units'}</span>
									{#if stats.totalRent > 0}
										<span class="dot">·</span>
										<span class="mono-num">{fmtMoney(stats.totalRent)}</span>
									{/if}
								</div>
								<div class="mobile-card-chevron">
									<ArrowRight class="h-4 w-4" />
								</div>
							</div>
						</div>
					</button>
				{/each}
				{#if realm.length === 0}
					<div class="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
						No properties found. Run the data import or seed properties first.
					</div>
				{/if}
			</div>
		{:else}
		<!-- Pan/zoom + reset controls -->
		<div class="mb-2 flex items-center justify-between gap-2">
			<p class="text-[11px] uppercase tracking-wide" style="color: var(--ink-4); letter-spacing: 0.12em;">drag empty space to pan · drag a card to reposition · wheel to zoom</p>
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
			onmousemove={onViewportMouseMove}
			role="presentation"
		>
		<!-- World layer — large enough to roam in -->
		<div use:panzoomAction class="card-canvas">
			<!-- Districts: visual backdrop, render BEHIND cards -->
			{#each districts as district (district.id)}
				<div
					class="district district-{district.color}"
					style={`left: ${district.x}px; top: ${district.y}px; width: ${district.width}px; height: ${district.height}px;`}
				>
					<div class="district-header" onmousedown={(e) => onDistrictMouseDown(e, district.id)} role="presentation">
						<input
							class="district-name"
							value={district.name}
							oninput={(e) => updateDistrictName(district.id, e.currentTarget.value)}
							onmousedown={(e) => e.stopPropagation()}
							onclick={(e) => e.stopPropagation()}
							spellcheck="false"
						/>
						<button
							type="button"
							class="district-action"
							title="Cycle color"
							onclick={(e) => { e.stopPropagation(); cycleDistrictColor(district.id); }}
							onmousedown={(e) => e.stopPropagation()}
						>
							<Palette class="h-3 w-3" />
						</button>
						<button
							type="button"
							class="district-action district-action-delete"
							title="Delete district"
							onclick={(e) => { e.stopPropagation(); deleteDistrict(district.id); }}
							onmousedown={(e) => e.stopPropagation()}
						>
							<X class="h-3 w-3" />
						</button>
					</div>
					<div
						class="district-resize-handle"
						onmousedown={(e) => onDistrictResizeMouseDown(e, district.id)}
						role="presentation"
						title="Resize"
					></div>
				</div>
			{/each}

			{#each realm as property, idx (property.id)}
				{@const stats = propertyStats(property)}
				{@const Icon = propertyTypeIcon(property.propertytype)}
				{@const badge = tenantBadge(property.org_slug)}
				{@const variant = property.units.length === 0
					? 'empty'
					: property.units.length === 1
						? 'single'
						: 'multi'}
				{@const sole = variant === 'single' ? property.units[0] : null}
				{@const tokenRows = Math.ceil(property.units.length / 2)}
				{@const pos = cardPositions[property.id] || defaultPos(idx)}

				<div
					role="button"
					tabindex="0"
					onclick={() => { if (!flippedCards[property.id]) focusCard(property.id); }}
					onkeydown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !flippedCards[property.id]) { e.preventDefault(); focusCard(property.id); } }}
					onmousedown={(e) => onCardMouseDown(e, property.id)}
					data-property-id={property.id}
					class="property-card group rounded-2xl border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
						{variant === 'empty' ? 'card-empty' : ''}
						{variant === 'single' ? 'card-single' : ''}
						{variant === 'multi' ? 'card-multi' : ''}"
					style={`position: absolute; left: ${pos.x}px; top: ${pos.y}px; ${variant === 'multi' ? `--token-rows:${tokenRows};` : ''}`}
				>
					<!-- Flip control — top-left, muted -->
					<button
						type="button"
						class="card-flip-btn"
						class:active={flippedCards[property.id]}
						onclick={(e) => toggleFlip(property.id, e)}
						onmousedown={(e) => e.stopPropagation()}
						title={flippedCards[property.id] ? 'Back to overview' : 'Property settings'}
					>
						<RotateCw class="h-3 w-3" />
					</button>

					<div class="flip-inner" class:flipped={flippedCards[property.id]}>
					<div class="card-face card-front flex flex-col">
					{#if variant === 'empty'}
						<!-- Compact card: small banner + icon, "vacant" label -->
						<div class="card-banner banner-compact">
							<div class="tenant-chip" data-slug={property.org_slug}>{badge.label}</div>
							<h2 class="card-title text-sm">{property.name}</h2>
						</div>
						{#if hasCoords(property)}
							<div class="map-banner">
								<PropertyMap lat={Number(property.latitude)} lng={Number(property.longitude)} height={84} boundary={property.boundary_geojson} />
							</div>
						{:else}
							<div class="flex flex-1 items-center justify-center px-3 py-3">
								<div class="hero-frame hero-frame-sm">
									<Icon class="h-5 w-5" />
								</div>
							</div>
						{/if}
						<div class="card-footer">
							<div class="rent-badge rent-badge-sm">
								<span class="rent-stamp">VACANT</span>
							</div>
							<button
								type="button"
								class="card-open-btn"
								onclick={(e) => { e.stopPropagation(); selectedPropertyId = property.id; }}
								onmousedown={(e) => e.stopPropagation()}
							>
								Open property <ArrowRight class="h-3.5 w-3.5" />
							</button>
						</div>

					{:else if variant === 'single'}
						<!-- Title-deed banner -->
						<div class="card-banner">
							<div class="tenant-chip" data-slug={property.org_slug}>{badge.label}</div>
							<h2 class="card-title">{property.name}</h2>
							<div class="banner-rule"></div>
							<div class="banner-sub">Single unit</div>
						</div>

						<!-- Hero — flush top-down map; tilts to 3D and rotates on hover (or icon fallback) -->
						{#if hasCoords(property)}
							<div class="map-banner">
								<PropertyMap lat={Number(property.latitude)} lng={Number(property.longitude)} height={150} boundary={property.boundary_geojson} />
							</div>
						{:else}
							<div class="hero-zone">
								<div class="hero-frame">
									<Icon class="h-7 w-7" />
								</div>
							</div>
						{/if}

						<!-- Resident — Monopoly "owner" panel. Click the token to edit
						     the rentee or assign a new one to the vacant unit. -->
						<div class="resident-panel">
							<div class="resident-token">
								<button
									type="button"
									class="unit-token unit-token-btn unit-token-xl {sole.tenant_id ? 'occupied' : 'vacant'}"
									title={sole.tenant_id ? sole.tenant_name || 'Tenant actions' : 'Add tenant'}
									onclick={(e) => { e.stopPropagation(); openTokenMenu(e, property.id, sole.id, sole.tenant_id ? { id: sole.tenant_id, name: sole.tenant_name } : null); }}
									onmousedown={(e) => e.stopPropagation()}
								>
									<User class="h-9 w-9" />
								</button>
							</div>
							<div class="resident-meta">
								{#if sole.tenant_name}
									<div class="resident-name">{sole.tenant_name}</div>
									{#if sole.rentee_nic}<div class="resident-line">NIC · {sole.rentee_nic}</div>{/if}
									{#if sole.tenant_phone}<div class="resident-line">☎ {sole.tenant_phone}</div>{/if}
								{:else}
									<div class="resident-name vacant">— vacant —</div>
								{/if}
								<div class="resident-unit">Unit · {sole.unitnumber}</div>
							</div>
						</div>

						<!-- Estate utility chips -->
						<div class="utility-strip flex items-center justify-between gap-1 px-4 py-2">
							{#each [
								{ Icon: Zap, label: 'Electricity', tint: 'hsl(var(--warning))' },
								{ Icon: Droplets, label: 'Water', tint: 'var(--aqua)' },
								{ Icon: Wifi, label: 'SLT', tint: 'hsl(var(--success))' }
							] as bill}
								<span class="utility-chip" title={`${bill.label} · no bill recorded`}>
									<bill.Icon class="h-3.5 w-3.5" style={`color: ${bill.tint};`} />
									<span class="ml-1 text-[10px] uppercase tracking-wide" style="color: var(--ink-4);">—</span>
								</span>
							{/each}
						</div>

						<!-- RENT footer -->
						<div class="card-footer">
							<div class="rent-badge">
								<div class="rent-label">Monthly Rent</div>
								<div class="rent-amount mono-num">{fmtMoney(stats.totalRent)}</div>
							</div>
							<button
								type="button"
								class="card-open-btn"
								onclick={(e) => { e.stopPropagation(); selectedPropertyId = property.id; }}
								onmousedown={(e) => e.stopPropagation()}
							>
								Open property <ArrowRight class="h-3.5 w-3.5" />
							</button>
						</div>

					{:else}
						<!-- Multi-unit card -->
						<!-- Title-deed banner -->
						<div class="card-banner">
							<div class="tenant-chip" data-slug={property.org_slug}>{badge.label}</div>
							<h2 class="card-title">{property.name}</h2>
							<div class="banner-rule"></div>
							<div class="banner-sub">{stats.total} {stats.total === 1 ? 'unit' : 'units'}</div>
						</div>

						<!-- Hero — flush top-down map; tilts to 3D and rotates on hover; with occupancy badge -->
						{#if hasCoords(property)}
							<div class="map-banner">
								<PropertyMap lat={Number(property.latitude)} lng={Number(property.longitude)} height={150} boundary={property.boundary_geojson} />
								<span class="hero-badge map-badge mono-num">{stats.occupied}/{stats.total}</span>
							</div>
						{:else}
							<div class="hero-zone">
								<div class="hero-frame">
									<Icon class="h-7 w-7" />
									<span class="hero-badge mono-num">{stats.occupied}/{stats.total}</span>
								</div>
							</div>
						{/if}

						<!-- 2-column house tokens. Click a token to edit the rentee
						     occupying that unit, or assign a new one if vacant. -->
						<div class="house-grid">
							{#each property.units as unit (unit.id)}
								<div class="house-cell">
									<button
										type="button"
										class="unit-token unit-token-btn {unit.tenant_id ? 'occupied' : 'vacant'}"
										title={`${unit.unitnumber}${unit.tenant_name ? ` · ${unit.tenant_name}` : ' · vacant'}`}
										onclick={(e) => { e.stopPropagation(); openTokenMenu(e, property.id, unit.id, unit.tenant_id ? { id: unit.tenant_id, name: unit.tenant_name } : null); }}
										onmousedown={(e) => e.stopPropagation()}
									>
										<User class="h-5 w-5" />
									</button>
								</div>
							{/each}
						</div>

						<!-- Estate utility chips -->
						<div class="utility-strip flex items-center justify-between gap-1 px-4 py-2">
							{#each [
								{ Icon: Zap, label: 'Electricity', tint: 'hsl(var(--warning))' },
								{ Icon: Droplets, label: 'Water', tint: 'var(--aqua)' },
								{ Icon: Wifi, label: 'SLT', tint: 'hsl(var(--success))' }
							] as bill}
								<span class="utility-chip" title={`${bill.label} · no bill recorded`}>
									<bill.Icon class="h-3.5 w-3.5" style={`color: ${bill.tint};`} />
									<span class="ml-1 text-[10px] uppercase tracking-wide" style="color: var(--ink-4);">—</span>
								</span>
							{/each}
						</div>

						<!-- RENT footer -->
						<div class="card-footer">
							<div class="rent-badge">
								<div class="rent-label">Monthly Rent</div>
								<div class="rent-amount mono-num">{fmtMoney(stats.totalRent)}</div>
							</div>
							<button
								type="button"
								class="card-open-btn"
								onclick={(e) => { e.stopPropagation(); selectedPropertyId = property.id; }}
								onmousedown={(e) => e.stopPropagation()}
							>
								Open property <ArrowRight class="h-3.5 w-3.5" />
							</button>
						</div>
					{/if}
					</div><!-- /.card-front -->

					<!-- BACK FACE: settings, copyable fields, assignments, actions -->
					<div class="card-face card-back flex flex-col">
						<div class="back-banner">
							<div class="banner-sub">Property settings</div>
							<h2 class="card-title text-base">{property.name}</h2>
						</div>

						<div class="back-body">
							<!-- COPYABLE FIELDS -->
							<div class="back-section">
								<div class="back-section-label">Reference</div>
								{#each [
									{ icon: MapPin, label: 'Address', value: property.address },
									{ icon: Zap, label: 'Electricity meter #', value: '' },
									{ icon: Droplets, label: 'Water meter #', value: '' },
									{ icon: Wifi, label: 'SLT account', value: '' },
									{ icon: Landmark, label: 'Bank account', value: property.bank_account_number || '' }
								] as f, i}
									{@const k = `${property.id}::${f.label}`}
									<div class="copy-row">
										<f.icon class="h-3.5 w-3.5 flex-shrink-0" style="color: var(--aqua);" />
										<div class="copy-meta">
											<div class="copy-label">{f.label}</div>
											<div class="copy-value" class:empty={!f.value}>{f.value || 'Not set'}</div>
										</div>
										<button
											type="button"
											class="copy-btn"
											disabled={!f.value}
											onclick={(e) => copyToClipboard(f.value, k, e)}
											onmousedown={(e) => e.stopPropagation()}
											title={f.value ? 'Copy' : 'Nothing to copy'}
										>
											{#if copiedFlash === k}
												<span class="copy-flash">✓</span>
											{:else}
												<Copy class="h-3 w-3" />
											{/if}
										</button>
									</div>
								{/each}
							</div>

							<!-- ASSIGNMENTS -->
							<div class="back-section">
								<div class="back-section-label">Assignments</div>
								<div class="assignment-row">
									<Wrench class="h-3.5 w-3.5 flex-shrink-0" style="color: var(--aqua);" />
									<div class="copy-meta">
										<div class="copy-label">Maintenance lead</div>
										<button
											type="button"
											class="assignment-picker"
											onclick={(e) => e.stopPropagation()}
											onmousedown={(e) => e.stopPropagation()}
										>
											Unassigned <ArrowRight class="h-3 w-3" />
										</button>
									</div>
								</div>
								<div class="assignment-row">
									<Bell class="h-3.5 w-3.5 flex-shrink-0" style="color: hsl(var(--destructive));" />
									<div class="copy-meta">
										<div class="copy-label">Escalation contact</div>
										<button
											type="button"
											class="assignment-picker"
											onclick={(e) => e.stopPropagation()}
											onmousedown={(e) => e.stopPropagation()}
										>
											Unassigned <ArrowRight class="h-3 w-3" />
										</button>
									</div>
								</div>
							</div>

							<!-- ACTIONS -->
							<div class="back-section back-actions">
								<button type="button" class="back-action-btn" onclick={(e) => e.stopPropagation()} onmousedown={(e) => e.stopPropagation()}>
									<Edit3 class="h-3 w-3" /> Edit details
								</button>
								<button type="button" class="back-action-btn" onclick={(e) => e.stopPropagation()} onmousedown={(e) => e.stopPropagation()}>
									<History class="h-3 w-3" /> Activity
								</button>
								<button type="button" class="back-action-btn back-action-warn" onclick={(e) => e.stopPropagation()} onmousedown={(e) => e.stopPropagation()}>
									<Archive class="h-3 w-3" /> Archive
								</button>
							</div>
						</div>
					</div><!-- /.card-back -->
					</div><!-- /.flip-inner -->
				</div>
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

			<!-- Live presence cursors (other users) -->
			{#each Object.entries(presenceCursors) as [uid, c] (uid)}
				<div
					class="presence-cursor"
					style={`left: ${c.x}px; top: ${c.y}px; --cursor-color: ${c.color};`}
				>
					<svg class="cursor-arrow" viewBox="0 0 16 18" width="14" height="16" aria-hidden="true">
						<path
							d="M0.5 0.5 L0.5 13.5 L4.2 10.6 L7 17 L9 16 L6.2 9.7 L11 9.7 Z"
							fill="var(--cursor-color)"
							stroke="rgba(0,0,0,0.5)"
							stroke-width="0.7"
							stroke-linejoin="round"
						/>
					</svg>
					<div class="cursor-tag">{c.name}</div>
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
				<button type="button" class="ctx-item" onclick={spawnDistrictFromMenu}>
					<Group class="h-4 w-4" style="color: var(--aqua);" />
					<span>Add district</span>
				</button>
				<div class="ctx-hint">more soon…</div>
			</div>
		{/if}

		{#if realm.length === 0}
			<div class="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
				No properties found. Run the data import or seed properties first.
			</div>
		{/if}

		<!-- Right-side control rail + slide-in panels -->
		<ManagerRightRail bind:active={activePanel} />
		{#if activePanel === 'contacts'}
			<ContactBook
				rentees={data.rentees || []}
				realm={data.realm || []}
				bankProfiles={data.bankProfiles || []}
				initialContext={contactBookContext}
				onClose={() => { activePanel = null; contactBookContext = null; }}
			/>
		{/if}
		{/if}
	{:else}
		<!-- Property detail -->
		{@const property = selectedProperty}
		{@const Icon = propertyTypeIcon(property.propertytype)}
		{@const badge = tenantBadge(property.org_slug)}

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
								<button
									type="button"
									class="unit-token unit-token-btn {unit.tenant_id ? 'occupied' : 'vacant'} !h-9 !w-9"
									title={unit.tenant_id ? unit.tenant_name || 'Tenant actions' : 'Add tenant'}
									onclick={(e) => { e.stopPropagation(); openTokenMenu(e, property.id, unit.id, unit.tenant_id ? { id: unit.tenant_id, name: unit.tenant_name } : null); }}
								>
									<User class="h-4 w-4" />
								</button>
								<h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">{unit.unitnumber}</h3>
							</div>
							<span class="text-[11px] font-medium uppercase tracking-wide {unit.tenant_id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}">
								{unit.tenant_id ? 'occupied' : 'vacant'}
							</span>
						</header>

						<div class="mb-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
							<div class="mb-1 flex items-center justify-between">
								<span class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Resident</span>
								{#if unit.tenant_id}
									<a href="/tenants/{unit.tenant_id}" class="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400">view</a>
								{/if}
							</div>
							{#if unit.tenant_name}
								<p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{unit.tenant_name}</p>
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
							{#if unit.tenant_id}
								<form method="POST" action="?/sendInvoice" use:enhance class="inline">
									<input type="hidden" name="unitId" value={unit.id} />
									<input type="hidden" name="propertyId" value={property.id} />
									<input type="hidden" name="renteeId" value={unit.tenant_id} />
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
								<a class="action-btn" href="/tenants/new?replaces={unit.tenant_id}&unit={unit.id}">
									<UserPlus class="h-3.5 w-3.5" /> Change
								</a>
							{:else}
								<a class="action-btn" href="/tenants/new?unit={unit.id}">
									<UserPlus class="h-3.5 w-3.5" /> Onboard
								</a>
							{/if}
						</div>

						{#if activeFormUnit === unit.id && unit.tenant_id}
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
								<input type="hidden" name="renteeId" value={unit.tenant_id} />
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

<!-- Unit-token popover. Lives outside the canvas branches so it works
     in both the manager view and the property-detail view; uses
     viewport-fixed positioning so it isn't clipped by the canvas. -->
{#if tokenMenu.open}
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-default"
		aria-label="Close menu"
		onclick={closeTokenMenu}
		oncontextmenu={(e) => { e.preventDefault(); closeTokenMenu(); }}
	></button>
	<div
		class="ctx-menu token-menu"
		style={`left: ${tokenMenu.x}px; top: ${tokenMenu.y}px;`}
		role="menu"
	>
		{#if tokenMenu.rentee?.name}
			<div class="ctx-hint token-menu-title">{tokenMenu.rentee.name}</div>
		{/if}
		{#if tokenMenu.rentee?.id}
			<a
				class="ctx-item ctx-item-primary"
				href="/invoices/new?tenantId={tokenMenu.rentee.id}&unitId={tokenMenu.unitId}&propertyId={tokenMenu.propertyId}"
				onclick={closeTokenMenu}
			>
				<Receipt class="h-4 w-4" style="color: var(--aqua);" />
				<span>Generate invoice</span>
			</a>
			<div class="ctx-divider"></div>
			<button type="button" class="ctx-item" onclick={tokenMenuEdit}>
				<Edit3 class="h-4 w-4" style="color: var(--aqua);" />
				<span>Edit tenant</span>
			</button>
			<button type="button" class="ctx-item" onclick={tokenMenuEditBilling}>
				<Wallet class="h-4 w-4" style="color: var(--aqua);" />
				<span>Edit billing</span>
			</button>
			<button type="button" class="ctx-item ctx-item-warn" onclick={openRemoveConfirm}>
				<UserMinus class="h-4 w-4" />
				<span>Remove tenant</span>
			</button>
		{:else}
			<button type="button" class="ctx-item" onclick={tokenMenuAdd}>
				<UserPlus class="h-4 w-4" style="color: var(--aqua);" />
				<span>Add tenant</span>
			</button>
		{/if}
		{#if tokenMenuContext}
			<div class="ctx-divider"></div>
			<div class="ctx-hint">Bank account</div>
			{#if tokenMenuContext.profiles.length === 0}
				<div class="ctx-hint" style="color:#94a3b8; text-transform:none; letter-spacing:0;">
					No profiles for this org. Add one in Properties → Bank profiles.
				</div>
			{:else if tokenMenuContext.currentBankProfileId && !bankExpanded}
				<button
					type="button"
					class="ctx-item"
					onclick={() => (bankExpanded = true)}
				>
					<Landmark class="h-4 w-4" style="color: var(--aqua);" />
					<span>{tokenMenuContext.currentBankProfileLabel}</span>
					<ChevronDown class="ctx-item-chev" />
				</button>
			{:else}
				{#each tokenMenuContext.profiles as bp (bp.id)}
					<form
						method="POST"
						action="?/setBankProfile"
						use:enhance={() => {
							return async ({ update }) => { await update(); closeTokenMenu(); };
						}}
					>
						<input type="hidden" name="unit_id" value={tokenMenu.unitId} />
						<input type="hidden" name="bank_profile_id" value={bp.id} />
						<button
							type="submit"
							class="ctx-item"
							class:ctx-item-active={bp.id === tokenMenuContext.currentBankProfileId}
						>
							<Landmark class="h-4 w-4" style="color: var(--aqua);" />
							<span>{bp.label}</span>
						</button>
					</form>
				{/each}
				{#if tokenMenuContext.currentBankProfileId}
					<form
						method="POST"
						action="?/setBankProfile"
						use:enhance={() => {
							return async ({ update }) => { await update(); closeTokenMenu(); };
						}}
					>
						<input type="hidden" name="unit_id" value={tokenMenu.unitId} />
						<input type="hidden" name="bank_profile_id" value="" />
						<button type="submit" class="ctx-item ctx-item-warn">
							<X class="h-4 w-4" />
							<span>Clear bank routing</span>
						</button>
					</form>
				{/if}
			{/if}
		{/if}
	</div>
{/if}

<!-- Billing-config editor panel — slides in alongside the contact book. -->
{#if activePanel === 'billing' && billingEditContext}
	<BillingConfigEditor
		agreementId={billingEditContext.agreementId}
		context={billingEditContext.context}
		initialConfig={billingEditContext.currentConfig}
		initialMeterReadings={billingEditContext.currentMeterReadings}
		onCancel={() => { activePanel = null; billingEditContext = null; }}
		onSaved={() => { activePanel = null; billingEditContext = null; }}
	/>
{/if}

<!-- Custom confirm modal — replaces the OS confirm() dialog so destructive
     actions get a red Confirm + a Cancel, on-brand. -->
{#if confirmDialog}
	<button
		type="button"
		class="confirm-backdrop"
		aria-label="Cancel"
		onclick={closeConfirmDialog}
	></button>
	<div class="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
		<div class="confirm-icon">
			<AlertTriangle class="h-5 w-5" />
		</div>
		<h2 id="confirm-title" class="confirm-title">{confirmDialog.title}</h2>
		<p class="confirm-message">{confirmDialog.message}</p>
		<div class="confirm-actions">
			<button type="button" class="confirm-cancel" onclick={closeConfirmDialog}>Cancel</button>
			{#if confirmDialog.kind === 'endTenancy'}
				<form
					method="POST"
					action="?/endTenancy"
					use:enhance={() => {
						return async ({ update }) => {
							closeConfirmDialog();
							await update({ reset: false });
						};
					}}
				>
					<input type="hidden" name="unitId" value={confirmDialog.unitId} />
					<button type="submit" class="confirm-destructive">{confirmDialog.confirmLabel}</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
</div>

<style>
	/* ─── Manager theme tokens — bound to global design tokens ─────────────
	   Manager keeps its bespoke OKLCH-feeling vocabulary (aqua, ink, panel)
	   but the values now flex per active theme + mode. Themes inherit via
	   --background/--foreground/--card/--accent etc. set on <html>. */
	:global(.aqua-theme) {
		--bg:        hsl(var(--background));        /* canvas */
		--panel:     hsl(var(--card));              /* card surface */
		--panel-2:   hsl(var(--secondary));         /* nested panel */
		--line:      hsl(var(--border));            /* borders */
		--line-soft: hsl(var(--border) / 0.6);      /* soft dividers */
		--ink:       hsl(var(--foreground));        /* primary text */
		--ink-2:     hsl(var(--foreground) / 0.85); /* secondary */
		--ink-3:     hsl(var(--muted-foreground));  /* tertiary / muted */
		--ink-4:     hsl(var(--muted-foreground) / 0.7); /* labels */

		--aqua:      hsl(var(--accent));            /* primary accent */
		--aqua-2:    hsl(var(--accent) / 0.85);     /* mid */
		--aqua-dim:  hsl(var(--accent) / 0.55);     /* dimmed accent */

		--good:      hsl(var(--success));
		--warn:      hsl(var(--warning));
		--bad:       hsl(var(--destructive));

		--r:    14px;
		--r-sm: 10px;
	}

	/* Glow halo helper — drop on any panel or card */
	:global(.aqua-theme) .glow-haze {
		position: relative;
		overflow: hidden;
	}
	:global(.aqua-theme) .glow-haze::before {
		content: '';
		position: absolute;
		inset: auto -120px -260px auto;
		width: 420px;
		height: 420px;
		border-radius: 50%;
		background: radial-gradient(circle, hsl(var(--accent) / 0.20) 0%, hsl(var(--accent) / 0) 60%);
		pointer-events: none;
	}

	/* Pulsing live dot */
	@keyframes aqua-pulse {
		0%, 100% { box-shadow: 0 0 0 3px hsl(var(--accent) / 0.18); }
		50%      { box-shadow: 0 0 0 7px hsl(var(--accent) / 0); }
	}
	:global(.aqua-theme) .aqua-dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--aqua);
		box-shadow: 0 0 0 3px hsl(var(--accent) / 0.18);
		animation: aqua-pulse 2.4s infinite;
	}

	/* Mono numerals à la solarsems stat figures */
	:global(.aqua-theme) .mono-num {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-feature-settings: 'zero', 'ss02';
		letter-spacing: -0.01em;
	}

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
		background: linear-gradient(160deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.55) 100%);
		color: hsl(var(--background));
		box-shadow:
			0 0 0 1px hsl(var(--accent) / 0.4) inset,
			0 4px 14px -4px hsl(var(--accent) / 0.55);
	}
	.unit-token.vacant {
		background: var(--panel-2);
		color: var(--ink-3);
		border: 1px solid var(--line);
	}
	.unit-token:hover {
		transform: translateY(-1px) scale(1.05);
		filter: brightness(1.1);
		z-index: 1;
	}
	.unit-token.occupied:hover {
		box-shadow:
			0 0 0 1px hsl(var(--accent) / 0.6) inset,
			0 6px 20px -4px hsl(var(--accent) / 0.7);
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

	/* Button variant of the unit token — strips the default <button>
	   chrome (background, border, padding, font) so it looks identical
	   to the original div, but adds keyboard focus + pointer cursor. */
	.unit-token-btn {
		appearance: none;
		padding: 0;
		font: inherit;
		border: none;
		cursor: pointer;
	}
	.unit-token-btn.vacant {
		border: 1px solid var(--line);
	}
	.unit-token-btn:focus-visible {
		outline: 2px solid hsl(var(--accent));
		outline-offset: 2px;
	}

	.canvas-viewport {
		position: relative;
		height: calc(100vh - 160px);
		min-height: 500px;
		border: 1px solid var(--line);
		border-radius: var(--r);
		overflow: hidden;
		/* Cursor-following spotlight + camera-anchored ambient haze + base color.
		   --mouse-x / --mouse-y are written from JS at 60Hz.
		   --cam-x / --cam-y move with the panzoom transform so the secondary
		   gradient appears anchored to the world (parallaxes with pan/zoom). */
		--mouse-x: 50%;
		--mouse-y: 50%;
		--spot-size: 160px;
		/* The camera-parallax radial gradients used to live here too, but they
		   forced CPU rasterization of two large radial gradients on every pan
		   frame — measurable jank on lower-spec laptops. Now just one
		   spotlight gradient (mouse-bound, only repaints on mousemove) plus a
		   plain base colour, both compositor-friendly. */
		background:
			radial-gradient(
				circle var(--spot-size) at var(--mouse-x) var(--mouse-y),
				hsl(var(--accent) / 0.22) 0%,
				hsl(var(--accent) / 0.07) 30%,
				hsl(var(--accent) / 0) 70%
			),
			hsl(var(--background));
		cursor: grab;
		transition: --spot-size 180ms ease;
	}
	.canvas-viewport:active { cursor: grabbing; }
	@property --spot-size {
		syntax: '<length>';
		inherits: true;
		initial-value: 160px;
	}

	:global(.aqua-theme .page-title) {
		color: var(--ink);
		text-shadow: 0 0 32px hsl(var(--accent) / 0.3);
		letter-spacing: -0.01em;
	}

	:global(.zoom-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: var(--panel);
		color: var(--ink-2);
		cursor: pointer;
		transition: background 100ms ease, border-color 100ms ease, color 100ms ease, box-shadow 100ms ease;
	}
	:global(.zoom-btn:hover) {
		background: var(--panel-2);
		border-color: hsl(var(--accent) / 0.4);
		color: var(--aqua);
		box-shadow: 0 0 18px -2px hsl(var(--accent) / 0.3);
	}

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

	/* ─── Districts (labeled regions) ───────────────────────────────────── */
	.district {
		position: absolute;
		border: 2px dashed var(--district-line, hsl(var(--accent) / 0.55));
		background: var(--district-bg, hsl(var(--accent) / 0.05));
		border-radius: 16px;
		min-width: 220px;
		min-height: 160px;
		z-index: 0;          /* sit behind cards (cards default render later in DOM) */
		pointer-events: none; /* let clicks pass through to cards/canvas underneath */
	}
	.district-aqua    { --district-line: hsl(var(--accent) / 0.55); --district-bg: hsl(var(--accent) / 0.06); }
	.district-rose    { --district-line: hsl(var(--destructive) / 0.55);  --district-bg: hsl(var(--destructive) / 0.06); }
	.district-emerald { --district-line: hsl(var(--success) / 0.55); --district-bg: hsl(var(--success) / 0.06); }
	.district-amber   { --district-line: hsl(var(--warning) / 0.55);  --district-bg: hsl(var(--warning) / 0.06); }

	.district-header {
		position: absolute;
		top: -14px;
		left: 16px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px 4px 10px;
		background: hsl(var(--background));
		border: 1.5px solid var(--district-line, hsl(var(--accent) / 0.55));
		border-radius: 8px;
		cursor: grab;
		pointer-events: auto;
		z-index: 6;
		max-width: calc(100% - 32px);
	}
	.district-header:active { cursor: grabbing; }
	.district-name {
		background: transparent;
		border: none;
		color: var(--district-line, var(--aqua));
		font-family: 'Fredoka', system-ui, sans-serif;
		font-weight: 600;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		outline: none;
		min-width: 60px;
		max-width: 220px;
		padding: 0 4px;
		cursor: text;
	}
	.district-name:focus { background: hsl(var(--card) / 0.6); border-radius: 4px; }

	.district-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition: background 100ms ease, color 100ms ease;
	}
	.district-action:hover { background: hsl(var(--accent) / 0.15); color: var(--aqua); }
	.district-action-delete:hover { background: hsl(var(--destructive) / 0.18); color: hsl(var(--destructive)); }

	.district-resize-handle {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 18px;
		height: 18px;
		cursor: nwse-resize;
		pointer-events: auto;
		background: linear-gradient(135deg, transparent 50%, var(--district-line, hsl(var(--accent) / 0.55)) 50%);
		border-bottom-right-radius: 14px;
		opacity: 0.7;
	}
	.district-resize-handle:hover { opacity: 1; }

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
	a.ctx-item { text-decoration: none; }
	.ctx-item.ctx-item-primary {
		background: hsl(var(--accent) / 0.18);
		color: hsl(var(--accent));
		font-weight: 600;
	}
	.ctx-item.ctx-item-primary:hover { background: hsl(var(--accent) / 0.28); }
	.ctx-item-warn { color: hsl(var(--destructive)); }
	.ctx-item-warn:hover {
		background: hsl(var(--destructive) / 0.18);
		color: hsl(var(--destructive));
	}
	.ctx-item-active { background: #1e293b; }
	.ctx-item-active::after {
		content: '✓';
		margin-left: auto;
		color: var(--aqua);
		font-weight: 600;
	}
	.ctx-divider {
		height: 1px;
		margin: 4px 6px;
		background: #1e293b;
	}
	.ctx-item-chev {
		width: 14px;
		height: 14px;
		margin-left: auto;
		color: #94a3b8;
	}
	.ctx-hint {
		padding: 6px 10px;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #64748b;
	}
	.token-menu-title {
		text-transform: none;
		letter-spacing: 0;
		font-size: 12px;
		font-weight: 600;
		color: hsl(var(--accent));
		margin-bottom: 2px;
	}
	.token-menu form {
		margin: 0;
		padding: 0;
	}

	/* Free-positioned cards on the canvas */
	.card-canvas {
		position: relative;
		width: 4000px;
		height: 3000px;
	}

	.property-card {
		width: 320px;
		min-height: 448px; /* ~5:7 portrait floor; card grows beyond it when content needs more */
		display: flex; /* makes the flip-inner stretch to fill the card */
		cursor: grab;
		background: var(--panel) !important;
		border-color: var(--line-soft) !important;
		color: var(--ink);
		position: relative;
		overflow: hidden; /* clip the haze and any 3D rotation overflow */
		box-shadow:
			0 1px 0 hsl(0 0% 100% / 0.04) inset,
			0 6px 20px -8px hsl(0 0% 0% / 0.6);
		transition: transform 120ms ease, border-color 120ms ease, box-shadow 200ms ease;
		perspective: 1400px;
		padding: 0;
	}
	/* Card flip mechanics — flex chain so the front face fills the card box
	   even when there's leftover space; the footer's margin-top: auto then
	   pushes itself flush to the bottom. */
	.flip-inner {
		position: relative;
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		transform-style: preserve-3d;
		transition: transform 700ms cubic-bezier(0.4, 0.05, 0.2, 1);
		border-radius: inherit;
	}
	.flip-inner.flipped { transform: rotateY(180deg); }
	.card-face {
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
		border-radius: inherit;
		overflow: hidden;
	}
	.card-front {
		position: relative;
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
	}
	.card-back {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		transform: rotateY(180deg);
		background: linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%);
	}
	/* Flip button — top-left, muted, escalates to aqua on hover/active */
	.card-flip-btn {
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: 5;
		width: 24px;
		height: 24px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: 1px solid hsl(var(--accent) / 0.15);
		background: hsl(var(--background) / 0.7);
		color: var(--ink-4);
		cursor: pointer;
		opacity: 0.55;
		transition: opacity 150ms ease, color 150ms ease, border-color 150ms ease, transform 250ms ease, background 150ms ease;
	}
	.card-flip-btn:hover {
		opacity: 1;
		color: var(--aqua);
		border-color: hsl(var(--accent) / 0.5);
		background: hsl(var(--card) / 0.9);
	}
	.card-flip-btn.active {
		opacity: 1;
		color: var(--aqua);
		border-color: var(--aqua);
		transform: rotate(180deg);
	}
	.property-card:active { cursor: grabbing; }
	.property-card:hover {
		border-color: hsl(var(--accent) / 0.45) !important;
		box-shadow:
			0 1px 0 hsl(0 0% 100% / 0.06) inset,
			0 8px 28px -6px hsl(var(--accent) / 0.18),
			0 0 0 1px hsl(var(--accent) / 0.12);
	}
	/* Soft aquamarine haze in the bottom-right of every card */
	.property-card::before {
		content: '';
		position: absolute;
		inset: auto -90px -180px auto;
		width: 360px;
		height: 360px;
		border-radius: 50%;
		background: radial-gradient(circle, hsl(var(--accent) / 0.18) 0%, hsl(var(--accent) / 0) 60%);
		pointer-events: none;
		z-index: 0;
		transition: opacity 200ms ease;
	}

	/* ─── Monopoly-card composition ───────────────────────────────────── */

	/* TITLE-DEED BANNER (top of card) */
	.card-banner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 16px 14px 12px;
		text-align: center;
		background: linear-gradient(180deg, hsl(var(--card) / 0.85), hsl(var(--background) / 0.6));
		border-bottom: 1px solid var(--line-soft);
		position: relative;
	}
	.banner-compact {
		padding: 10px 10px 8px;
		gap: 4px;
	}
	.card-banner .tenant-chip {
		align-self: center;
		font-size: 9px !important;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.card-title {
		color: var(--ink);
		font-family: 'Fredoka', system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-shadow: 0 0 24px hsl(var(--accent) / 0.25);
		font-size: 18px;
		line-height: 1.15;
		text-align: center;
		max-width: 100%;
		/* Wrap to two lines max, then ellipsize */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		word-break: break-word;
	}
	.banner-rule {
		width: 60%;
		height: 1px;
		background: linear-gradient(90deg, transparent, hsl(var(--accent) / 0.45), transparent);
		margin: 4px 0 2px;
	}
	.banner-sub {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--ink-4);
		font-style: italic;
	}

	/* HERO ZONE (icon pedestal) */
	.hero-zone {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 14px 14px 8px;
	}
	.hero-frame {
		position: relative;
		width: 64px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background:
			radial-gradient(circle at 30% 25%, hsl(var(--accent) / 0.45) 0%, hsl(var(--accent) / 0.3) 60%),
			hsl(var(--card));
		color: var(--aqua);
		box-shadow:
			0 0 0 2px hsl(var(--accent) / 0.4) inset,
			0 0 0 4px hsl(var(--accent) / 0.15),
			0 0 28px -4px hsl(var(--accent) / 0.55);
	}
	.hero-frame-sm {
		width: 44px;
		height: 44px;
		box-shadow:
			0 0 0 1px hsl(var(--accent) / 0.4) inset,
			0 0 0 3px hsl(var(--accent) / 0.12),
			0 0 16px -4px hsl(var(--accent) / 0.4);
	}
	/* Edge-to-edge map banner — no padding, no margin, no rounded corners.
	   The card's own border-radius + overflow:hidden clips the top corners. */
	.map-banner {
		position: relative;
		width: 100%;
		margin: 0;
		padding: 0;
		line-height: 0;
	}
	/* Occupancy badge sits inside the map banner's bottom-right corner
	   (instead of overflowing the way it does for the circle hero-frame). */
	.map-badge {
		bottom: 6px;
		right: 6px;
	}
	.hero-badge {
		position: absolute;
		bottom: -6px;
		right: -10px;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--aqua);
		color: hsl(var(--background));
		font-size: 10px;
		font-weight: 700;
		box-shadow: 0 2px 8px hsl(var(--accent) / 0.5);
	}

	/* RESIDENT PANEL (single-unit "owner" card) — grows to absorb extra vertical
	   space so the rent footer stays flush at the bottom without leaving a gap. */
	.resident-panel {
		margin: 0 14px;
		padding: 12px;
		display: flex;
		gap: 12px;
		align-items: center;
		background: hsl(var(--background) / 0.6);
		border: 1px solid var(--line-soft);
		border-radius: 12px;
		flex: 1 1 auto;
		min-height: 0;
	}
	.resident-meta { min-width: 0; flex: 1; }
	.resident-name {
		font-family: 'Fredoka', system-ui, sans-serif;
		font-weight: 600;
		font-size: 16px;
		color: var(--ink);
		line-height: 1.1;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		word-break: break-word;
	}
	.resident-name.vacant { color: var(--ink-3); font-style: italic; }
	.resident-line { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
	.resident-unit {
		margin-top: 6px;
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--ink-4);
	}

	/* HOUSE GRID (multi-unit token grid) */
	.house-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
		margin: 8px 14px;
	}
	.house-cell {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 0;
		border-radius: 8px;
		background: hsl(var(--background) / 0.5);
		border: 1px solid var(--line-soft);
	}

	/* RENT BADGE (Monopoly-style footer) */
	.rent-badge {
		margin: 12px 14px 14px;
		padding: 8px 14px;
		text-align: center;
		background:
			radial-gradient(ellipse at center, hsl(var(--accent) / 0.18), hsl(var(--accent) / 0)),
			hsl(var(--background) / 0.7);
		border: 2px solid hsl(var(--accent) / 0.4);
		border-radius: 10px;
		box-shadow:
			0 0 0 1px hsl(var(--accent) / 0.2) inset,
			0 0 24px -6px hsl(var(--accent) / 0.4);
		position: relative;
	}
	.rent-badge::before, .rent-badge::after {
		/* Monopoly title-deed brackets at the corners */
		content: '';
		position: absolute;
		width: 10px;
		height: 10px;
		border: 2px solid var(--aqua);
	}
	.rent-badge::before {
		top: -2px; left: -2px;
		border-right: none; border-bottom: none;
		border-top-left-radius: 8px;
	}
	.rent-badge::after {
		bottom: -2px; right: -2px;
		border-left: none; border-top: none;
		border-bottom-right-radius: 8px;
	}
	.rent-badge-sm {
		margin: 8px;
		padding: 4px 10px;
	}
	.rent-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--ink-3);
	}
	.rent-amount {
		font-size: 20px;
		font-weight: 600;
		color: var(--aqua);
		text-shadow: 0 0 18px hsl(var(--accent) / 0.5);
		letter-spacing: -0.01em;
	}
	.rent-stamp {
		font-family: 'Fredoka', system-ui, sans-serif;
		font-weight: 700;
		font-size: 11px;
		letter-spacing: 0.2em;
		color: var(--ink-3);
		text-transform: uppercase;
	}

	.card-iconwell {
		/* Legacy class kept for any straggler usage; no longer applied to header */
		background: linear-gradient(160deg, hsl(var(--accent) / 0.25), hsl(var(--accent) / 0.25));
		color: var(--aqua);
	}

	/* ─── BACK FACE: settings, copy fields, assignments, actions ───────── */
	.back-banner {
		padding: 8px 12px 6px 36px; /* leave room for the flip button */
		text-align: left;
		border-bottom: 1px solid var(--line-soft);
		background: linear-gradient(180deg, hsl(var(--card) / 0.85), hsl(var(--background) / 0.6));
	}
	.back-banner .banner-sub {
		text-align: left;
		margin-bottom: 2px;
		font-size: 8px;
		letter-spacing: 0.16em;
	}
	.back-banner .card-title {
		text-align: left;
		font-size: 14px;
		line-height: 1.1;
	}

	.back-body {
		flex: 1;
		overflow-y: auto;
		padding: 8px 10px 8px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-family: 'Inter Tight', system-ui, sans-serif;
	}

	.back-section {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.back-section-label {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--ink-4);
		font-weight: 500;
		padding-bottom: 3px;
		margin-bottom: 2px;
		border-bottom: 1px dashed var(--line-soft);
	}

	.copy-row, .assignment-row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 2px 0;
	}
	.copy-meta { flex: 1; min-width: 0; }
	.copy-label {
		font-size: 8.5px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--ink-4);
		line-height: 1;
	}
	.copy-value {
		font-size: 11px;
		color: var(--ink);
		margin-top: 1px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.15;
	}
	.copy-value.empty {
		color: var(--ink-4);
		font-style: italic;
	}
	.copy-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: 1px solid var(--line-soft);
		background: hsl(var(--card) / 0.6);
		color: var(--ink-3);
		cursor: pointer;
		transition: background 100ms ease, color 100ms ease, border-color 100ms ease;
	}
	.copy-btn:hover:not(:disabled) {
		background: hsl(var(--accent) / 0.12);
		color: var(--aqua);
		border-color: hsl(var(--accent) / 0.3);
	}
	.copy-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.copy-flash {
		font-size: 11px;
		color: var(--aqua);
		font-weight: 700;
	}

	.assignment-picker {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		width: 100%;
		margin-top: 3px;
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid var(--line-soft);
		background: hsl(var(--card) / 0.5);
		color: var(--ink-3);
		font-family: inherit;
		font-size: 12px;
		font-style: italic;
		text-align: left;
		cursor: pointer;
		transition: background 100ms ease, border-color 100ms ease, color 100ms ease;
	}
	.assignment-picker:hover {
		background: hsl(var(--card) / 0.8);
		border-color: hsl(var(--accent) / 0.3);
		color: var(--ink);
	}
	.assignment-picker svg { color: var(--ink-4); }

	.back-actions {
		flex-direction: row;
		flex-wrap: wrap;
		gap: 6px;
	}
	.back-action-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border-radius: 6px;
		border: 1px solid var(--line-soft);
		background: hsl(var(--card) / 0.6);
		color: var(--ink-2);
		font-family: inherit;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		cursor: pointer;
		transition: background 100ms ease, color 100ms ease, border-color 100ms ease;
	}
	.back-action-btn:hover {
		background: hsl(var(--accent) / 0.12);
		color: var(--aqua);
		border-color: hsl(var(--accent) / 0.3);
	}
	.back-action-btn.back-action-warn:hover {
		background: hsl(var(--destructive) / 0.12);
		color: hsl(var(--destructive));
		border-color: hsl(var(--destructive) / 0.3);
	}
	.tenant-chip {
		background: hsl(var(--accent) / 0.08);
		color: var(--aqua);
		border: 1px solid hsl(var(--accent) / 0.25);
	}
	.tenant-chip[data-slug='kubeira-family']    { color: hsl(var(--destructive)); background: hsl(var(--destructive) / 0.08); border-color: hsl(var(--destructive) / 0.3); }
	.tenant-chip[data-slug='kubeira-holdings']  { color: hsl(var(--success)); background: hsl(var(--success) / 0.08); border-color: hsl(var(--success) / 0.3); }
	.tenant-chip[data-slug='kubeira-it-park']   { color: var(--aqua); background: hsl(var(--accent) / 0.08); border-color: hsl(var(--accent) / 0.3); }
	.tenant-chip[data-slug='vishwara-holdings'] { color: hsl(var(--warning)); background: hsl(var(--warning) / 0.08); border-color: hsl(var(--warning) / 0.3); }
	.tenant-chip[data-slug='kubeira-family'] .aqua-dot { background: hsl(var(--destructive)); box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.18); animation-name: pulse-rose; }
	.tenant-chip[data-slug='kubeira-holdings'] .aqua-dot { background: hsl(var(--success)); box-shadow: 0 0 0 3px hsl(var(--success) / 0.18); animation-name: pulse-good; }
	.tenant-chip[data-slug='vishwara-holdings'] .aqua-dot { background: hsl(var(--warning)); box-shadow: 0 0 0 3px hsl(var(--warning) / 0.18); animation-name: pulse-warm; }
	@keyframes pulse-rose { 0%,100%{box-shadow:0 0 0 3px hsl(var(--destructive) / 0.18);} 50%{box-shadow:0 0 0 7px hsl(var(--destructive) / 0);} }
	@keyframes pulse-good { 0%,100%{box-shadow:0 0 0 3px hsl(var(--success) / 0.18);} 50%{box-shadow:0 0 0 7px hsl(var(--success) / 0);} }
	@keyframes pulse-warm { 0%,100%{box-shadow:0 0 0 3px hsl(var(--warning) / 0.18);} 50%{box-shadow:0 0 0 7px hsl(var(--warning) / 0);} }
	/* Don't force position: relative on .flip-inner — it must stay absolute to fill the card */
	.property-card > .card-flip-btn { z-index: 5; }

	/* "Lighter box" footer wrapping the rent badge + the slide-in Open Property
	   button. Sticks to the card bottom via margin-top: auto. The button sits
	   inside it, collapsed by default; on hover the wrapper grows upward,
	   pushing the rent up. */
	.card-footer {
		margin: 8px 12px 12px;
		margin-top: auto;
		padding: 6px;
		background: hsl(var(--card) / 0.55);
		border: 1px solid var(--line-soft);
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.card-footer .rent-badge {
		margin: 0;
	}
	.card-open-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		max-height: 0;
		opacity: 0;
		margin-top: 0;
		padding: 0 12px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: linear-gradient(180deg, hsl(var(--accent)) 0%, hsl(var(--accent) / 0.55) 100%);
		color: hsl(var(--background));
		font-family: 'Fredoka', system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
		overflow: hidden;
		box-shadow: none;
		transition:
			max-height 240ms cubic-bezier(0.4, 0, 0.2, 1),
			opacity 200ms ease,
			margin-top 240ms cubic-bezier(0.4, 0, 0.2, 1),
			padding 240ms ease,
			border-color 200ms ease,
			box-shadow 200ms ease;
	}
	.property-card:hover .card-open-btn {
		max-height: 36px;
		opacity: 1;
		margin-top: 6px;
		padding: 8px 12px;
		border-color: var(--aqua);
		box-shadow: 0 6px 16px -4px hsl(var(--accent) / 0.5);
	}
	.card-open-btn:hover {
		filter: brightness(1.1);
		box-shadow: 0 10px 24px -4px hsl(var(--accent) / 0.6);
	}
	/* Hide the button entirely when card is flipped */
	.flip-inner.flipped .card-open-btn { display: none; }
	/* Single-unit "showcase" cards get a stronger halo */
	.property-card.card-single::before {
		background: radial-gradient(circle, hsl(var(--accent) / 0.28) 0%, hsl(var(--accent) / 0) 60%);
		width: 460px;
		height: 460px;
	}

	.card-empty {
		width: 280px;
		min-height: 392px; /* 5:7 floor */
	}
	.card-single {
		width: 360px;
		min-height: 504px; /* 5:7 floor; grows to fit Open Property button on hover */
	}
	.card-multi {
		width: 320px;
		min-height: 0; /* purely content-driven */
	}

	.utility-strip {
		border-top: 1px solid var(--line-soft);
		border-bottom: 1px solid var(--line-soft);
		background: hsl(var(--background) / 0.55);
	}
	.utility-chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 4px 6px;
		border-radius: 6px;
		background: hsl(var(--card) / 0.7);
		border: 1px solid var(--line-soft);
		transition: background 100ms ease, border-color 100ms ease;
	}
	.property-card:hover .utility-chip {
		background: hsl(var(--card) / 0.85);
		border-color: hsl(var(--accent) / 0.18);
	}

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

	/* ── Mobile property stack ──────────────────────────────────────────── */
	.mobile-stack {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 4px 0 24px;
	}
	.mobile-card {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 14px;
		overflow: hidden;
		text-align: left;
		cursor: pointer;
		transition: border-color 100ms ease, transform 80ms ease;
		color: var(--ink);
		font-family: inherit;
		padding: 0;
		width: 100%;
	}
	.mobile-card:active {
		transform: scale(0.99);
		border-color: hsl(var(--accent) / 0.5);
	}
	.mobile-card-banner {
		width: 100%;
		background: hsl(var(--background));
		min-height: 110px;
	}
	.mobile-card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 110px;
		color: var(--aqua);
	}
	.mobile-card-body {
		padding: 12px 14px 14px;
	}
	.mobile-card-header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		margin-bottom: 6px;
	}
	.mobile-card-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--ink);
		margin: 0;
		line-height: 1.2;
		font-family: 'Fredoka', system-ui, sans-serif;
		letter-spacing: -0.005em;
	}
	.mobile-card-stats {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--ink-3);
	}
	.mobile-card-stats .dot {
		color: var(--ink-4);
	}
	.mobile-card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 8px;
	}
	.mobile-card-chevron {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 6px;
		color: var(--ink-3);
		opacity: 0.7;
	}
	/* Tenant chip — give it explicit padding on the mobile stack so the label
	   has breathing room from its colored background edges. */
	.mobile-stack .tenant-chip {
		display: inline-block;
		padding: 3px 9px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		border-radius: 5px;
		line-height: 1.4;
	}

	/* Live presence cursors — positioned in canvas (world) coords inside the
	   card-canvas, so they pan/zoom alongside everything else. */
	.presence-cursor {
		position: absolute;
		left: 0;
		top: 0;
		pointer-events: none;
		z-index: 60;
		transition: left 80ms linear, top 80ms linear;
		will-change: left, top;
	}
	.presence-cursor .cursor-arrow {
		display: block;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
	}
	.presence-cursor .cursor-tag {
		position: absolute;
		left: 12px;
		top: 16px;
		padding: 2px 7px;
		border-radius: 5px;
		background: var(--cursor-color);
		color: #fff;
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.01em;
		white-space: nowrap;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Custom confirm modal ─────────────────────────────────────────── */
	.confirm-backdrop {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		border: none;
		cursor: default;
	}
	.confirm-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 61;
		width: min(420px, calc(100vw - 32px));
		padding: 22px 24px 18px;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 14px;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
		font-family: 'Inter Tight', system-ui, sans-serif;
		color: #e2e8f0;
	}
	.confirm-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		margin-bottom: 12px;
		border-radius: 10px;
		background: hsl(var(--destructive) / 0.18);
		color: hsl(var(--destructive));
	}
	.confirm-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #f8fafc;
	}
	.confirm-message {
		margin: 8px 0 18px;
		font-size: 13px;
		line-height: 1.5;
		color: #cbd5e1;
	}
	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.confirm-actions form { margin: 0; padding: 0; }
	.confirm-cancel,
	.confirm-destructive {
		padding: 8px 16px;
		font-size: 13px;
		font-weight: 600;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
	}
	.confirm-cancel {
		background: transparent;
		color: #cbd5e1;
		border: 1px solid #334155;
	}
	.confirm-cancel:hover {
		background: #1e293b;
		color: #f8fafc;
	}
	.confirm-destructive {
		background: hsl(var(--destructive));
		color: white;
		border: 1px solid hsl(var(--destructive));
	}
	.confirm-destructive:hover {
		filter: brightness(1.06);
	}
</style>
