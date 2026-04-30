import { error } from '@sveltejs/kit';
import { reportCursor, reportBye, subscribe } from '$lib/server/presence.js';

/**
 * Server-Sent Events stream of cursor presence on the manager canvas.
 * Each event is JSON: { type: 'cursor' | 'bye', userId, name?, color?, x?, y? }.
 * Heartbeat comments keep the connection open through proxies.
 */
export const GET = async ({ locals, request }) => {
	if (!locals.user?.id) error(401, 'Not authenticated');

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			let closed = false;
			const safeEnqueue = (chunk) => {
				if (closed) return;
				try { controller.enqueue(encoder.encode(chunk)); } catch { closed = true; }
			};

			// Tell the client who *they* are so they don't render their own cursor.
			safeEnqueue(`event: hello\ndata: ${JSON.stringify({ userId: locals.user.id })}\n\n`);

			const unsubscribe = subscribe((evt) => {
				safeEnqueue(`data: ${JSON.stringify(evt)}\n\n`);
			});

			// 15s heartbeat — comment lines are ignored by EventSource but keep
			// load balancers / browsers from closing idle connections.
			const heartbeat = setInterval(() => safeEnqueue(`: hb\n\n`), 15000);

			const onAbort = () => {
				closed = true;
				clearInterval(heartbeat);
				unsubscribe();
				try { controller.close(); } catch {}
			};
			request.signal.addEventListener('abort', onAbort);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};

export const POST = async ({ request, locals }) => {
	if (!locals.user?.id) error(401, 'Not authenticated');

	let body;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const userId = locals.user.id;
	const name = locals.user.name || locals.user.email || 'Someone';

	if (body?.bye) {
		reportBye(userId);
		return new Response(null, { status: 204 });
	}

	const x = Number(body?.x);
	const y = Number(body?.y);
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		error(400, 'x and y must be numbers');
	}

	reportCursor({ userId, name, x, y });
	return new Response(null, { status: 204 });
};
