// In-memory presence (live cursors) for the manager canvas.
//
// Single-process only. If we ever scale horizontally, swap the EventEmitter
// for Postgres LISTEN/NOTIFY or Redis pub/sub.
//
// Cursors auto-expire after PRESENCE_TTL_MS without a heartbeat; clients send
// at least one cursor update per ~2s while the page has focus.

import { EventEmitter } from 'node:events';

const PRESENCE_TTL_MS = 6000;
const SWEEP_INTERVAL_MS = 2000;

/** @type {Map<string, { userId: string, name: string, color: string, x: number, y: number, lastSeen: number }>} */
const cursors = new Map();
const channel = new EventEmitter();
// Allow many simultaneous SSE listeners.
channel.setMaxListeners(64);

let sweeperStarted = false;
function ensureSweeper() {
	if (sweeperStarted) return;
	sweeperStarted = true;
	setInterval(() => {
		const now = Date.now();
		for (const [id, c] of cursors) {
			if (now - c.lastSeen > PRESENCE_TTL_MS) {
				cursors.delete(id);
				channel.emit('event', { type: 'bye', userId: id });
			}
		}
	}, SWEEP_INTERVAL_MS).unref?.();
}
ensureSweeper();

/**
 * Deterministic per-user color from the user id (HSL 0..360). Same user always
 * gets the same color so identification is stable across reconnects.
 */
export function colorForUser(userId) {
	let h = 0;
	for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
	const hue = h % 360;
	return `hsl(${hue} 80% 60%)`;
}

/** Report this user's cursor (creates or refreshes the entry). */
export function reportCursor({ userId, name, x, y }) {
	if (!userId || typeof x !== 'number' || typeof y !== 'number') return;
	const existing = cursors.get(userId);
	const color = existing?.color || colorForUser(userId);
	const next = {
		userId,
		name: name || existing?.name || 'Someone',
		color,
		x,
		y,
		lastSeen: Date.now()
	};
	cursors.set(userId, next);
	channel.emit('event', { type: 'cursor', ...next });
}

/** Explicit goodbye — fires immediately without waiting for TTL. */
export function reportBye(userId) {
	if (!userId) return;
	if (!cursors.has(userId)) return;
	cursors.delete(userId);
	channel.emit('event', { type: 'bye', userId });
}

/**
 * Subscribe to presence events. Calls handler with the snapshot of currently-
 * known cursors first, then live updates. Returns an unsubscribe fn.
 */
export function subscribe(handler) {
	for (const c of cursors.values()) {
		handler({ type: 'cursor', ...c });
	}
	channel.on('event', handler);
	return () => channel.off('event', handler);
}
