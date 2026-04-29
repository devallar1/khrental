// Better-Auth browser client.
//
// Used by login pages to call the auth endpoints (sign in, sign out,
// send OTP, request magic link, etc.). Mirrors the server config in
// src/lib/server/auth.ts — same plugins, same basePath.

import { createAuthClient } from 'better-auth/svelte';
import { phoneNumberClient, magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
    basePath: '/auth',
    plugins: [phoneNumberClient(), magicLinkClient()]
});

export const { signIn, signOut, signUp, useSession } = authClient;
