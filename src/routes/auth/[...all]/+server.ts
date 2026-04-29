// Better-Auth catch-all route.
//
// Handles every request under /auth/* — sign-in, sign-out, OAuth callbacks,
// phone OTP send/verify, magic link request/verify, session reads, etc.

import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const handler: RequestHandler = ({ request }) => auth.handler(request);

export const GET = handler;
export const POST = handler;
