<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';
	import toast from 'svelte-french-toast';

	const next = $derived($page.url.searchParams.get('next') || '/dashboard');
	const showPassword = $derived($page.url.searchParams.get('password') === 'true');

	let email = $state('');
	let password = $state('');
	let busy = $state(false);

	async function signInGoogle() {
		if (busy) return;
		busy = true;
		try {
			const { error } = await authClient.signIn.social({
				provider: 'google',
				callbackURL: next
			});
			if (error) {
				toast.error(error.message || 'Google sign-in failed.');
				busy = false;
			}
			// On success Better-Auth navigates the browser; no goto() needed.
		} catch (err) {
			toast.error(err?.message || 'Google sign-in failed.');
			busy = false;
		}
	}

	async function signInPassword() {
		if (busy) return;
		busy = true;
		try {
			const { error } = await authClient.signIn.email({
				email,
				password,
				callbackURL: next
			});
			if (error) {
				toast.error(error.message || 'Sign-in failed.');
				return;
			}
			await goto(next);
		} catch (err) {
			toast.error(err?.message || 'Sign-in failed.');
		} finally {
			busy = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-sky-950 to-blue-900 p-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-6">
			<p class="text-[11px] uppercase tracking-[0.28em] text-amber-200">KH Rentals</p>
			<h1 class="mt-2 text-2xl font-semibold tracking-tight text-white">Staff sign-in</h1>
		</div>

		<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
			<button
				onclick={signInGoogle}
				disabled={busy}
				class="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-white py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-50 disabled:opacity-50"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
					<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.997 10.997 0 0012 23z" fill="#34A853"/>
					<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a10.997 10.997 0 000 9.86l3.66-2.84z" fill="#FBBC05"/>
					<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
				</svg>
				{busy ? 'Signing in…' : 'Sign in with Google'}
			</button>

			{#if showPassword}
				<div class="my-5 flex items-center gap-3 text-xs text-sky-200/70">
					<div class="flex-1 h-px bg-white/10"></div>
					<span>break-glass</span>
					<div class="flex-1 h-px bg-white/10"></div>
				</div>

				<form onsubmit={(e) => { e.preventDefault(); signInPassword(); }} class="space-y-4">
					<label class="block">
						<span class="text-xs font-medium text-sky-200">Email</span>
						<input
							type="email"
							bind:value={email}
							required
							class="mt-1 block w-full rounded-2xl border-0 bg-white/10 px-4 py-2.5 text-sm text-white focus:bg-white/15 focus:ring-2 focus:ring-amber-400 focus:outline-none"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-sky-200">Password</span>
						<input
							type="password"
							bind:value={password}
							required
							class="mt-1 block w-full rounded-2xl border-0 bg-white/10 px-4 py-2.5 text-sm text-white focus:bg-white/15 focus:ring-2 focus:ring-amber-400 focus:outline-none"
						/>
					</label>
					<button
						type="submit"
						disabled={busy || !email || !password}
						class="w-full rounded-2xl border border-white/10 bg-white/10 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
					>
						{busy ? 'Signing in…' : 'Sign in with password'}
					</button>
				</form>
			{/if}
		</div>

	</div>
</div>
