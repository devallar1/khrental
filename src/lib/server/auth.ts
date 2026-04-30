// Better-Auth instance.
//
// One instance per process. Wired into the SvelteKit app at:
//   - src/routes/auth/[...all]/+server.ts  (catch-all HTTP handler)
//   - src/hooks.server.js                   (session lookup → event.locals.user)
//
// Identity tables (auth_user / auth_session / auth_account / auth_verification)
// live in the same Postgres as the app data; see migrations 20260429_01 / _02.

import { randomUUID } from 'crypto';
import { betterAuth } from 'better-auth';
import { phoneNumber, magicLink } from 'better-auth/plugins';
import { getPool } from '$api/db/pool.js';
import { pickSmsSender, normalisePhone } from './sms';
import { pickEmailSender } from './email';

const required = (name: string): string => {
    const value = process.env[name];
    if (!value || value.length === 0) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
};

const optional = (name: string): string | undefined => {
    const value = process.env[name];
    return value && value.length > 0 ? value : undefined;
};

const sms = pickSmsSender();
const email = pickEmailSender();

const googleClientId = optional('GOOGLE_CLIENT_ID');
const googleClientSecret = optional('GOOGLE_CLIENT_SECRET');
const googleEnabled = Boolean(googleClientId && googleClientSecret);

if (!googleEnabled) {
    console.warn('[auth] GOOGLE_CLIENT_ID/SECRET not set — staff Google sign-in is disabled.');
}

// Trusted origins for CSRF / "invalid origin" checks. baseURL is implicitly
// trusted; this lets us also accept localhost during dev and additional public
// domains (e.g. when fronted by Cloudflare + Caddy at rental.kubeira.com).
const trustedOriginsEnv = optional('BETTER_AUTH_TRUSTED_ORIGINS');
const trustedOrigins = trustedOriginsEnv
    ? trustedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

export const auth = betterAuth({
    secret: required('BETTER_AUTH_SECRET'),
    baseURL: required('BETTER_AUTH_URL'),
    basePath: '/auth',
    trustedOrigins,

    database: getPool(),

    advanced: {
        database: {
            generateId: () => randomUUID()
        }
    },

    user: { modelName: 'auth_user' },
    session: { modelName: 'auth_session' },
    verification: { modelName: 'auth_verification' },
    account: {
        modelName: 'auth_account',
        accountLinking: {
            enabled: true,
            // Google's email_verified is trustworthy. When Microsoft Entra is
            // added later, include 'microsoft' here too.
            trustedProviders: ['google'],
            allowDifferentEmails: false
        }
    },

    emailAndPassword: {
        enabled: true,
        // TODO(auth-v1): set to true once email sender is wired to a real provider.
        requireEmailVerification: false,
        // TODO(auth-v1): set to true once invite flow lands so only invited
        // emails can register. For now, leave open so dev testing works.
        disableSignUp: false,
        minPasswordLength: 10
    },

    socialProviders: googleEnabled
        ? {
            google: {
                clientId: googleClientId!,
                clientSecret: googleClientSecret!,
                // Managers may use either Google Workspace or personal Gmail
                // that matches their work email — no `hd` restriction.
                disableSignUp: false
            }
        }
        : {},

    plugins: [
        phoneNumber({
            sendOTP: async ({ phoneNumber: rawPhone, code }) => {
                const to = normalisePhone(rawPhone);
                await sms.send(to, `Your KH Rentals sign-in code: ${code}`);
            },
            otpLength: 6,
            // 5 minutes; tighter than Better-Auth's default 10.
            expiresIn: 5 * 60,
            // TODO(auth-v1): tighten once invite flow lands. For now we let
            // verification create users so the OTP loop can be tested end-to-end.
            signUpOnVerification: {
                getTempEmail: (phone: string) => `${phone}@phone.local`
            }
        }),
        magicLink({
            sendMagicLink: async ({ email: to, url }) => {
                await email.send(
                    to,
                    'Sign in to KH Rentals',
                    `Click to sign in:\n\n${url}\n\nThis link expires in 5 minutes.`
                );
            },
            expiresIn: 5 * 60
        })
    ],

    rateLimit: {
        enabled: true,
        // Better-Auth defaults are reasonable; explicit so we know what we shipped.
        window: 60,
        max: 10
    }
});

export type Session = typeof auth.$Infer.Session;
