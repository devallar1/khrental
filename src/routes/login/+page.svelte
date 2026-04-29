<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authClient } from '$lib/auth-client';
	import toast from 'svelte-french-toast';

	const next = $derived($page.url.searchParams.get('next') || '/dashboard');

	let mode = $state(/** @type {'phone' | 'email'} */ ('phone'));
	let phone = $state('');
	let otpSent = $state(false);
	let otp = $state('');
	let email = $state('');
	let password = $state('');
	let useMagicLink = $state(false);
	let busy = $state(false);

	async function sendOtp() {
		if (busy) return;
		busy = true;
		try {
			const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: phone });
			if (error) {
				toast.error(error.message || 'Could not send code.');
				return;
			}
			otpSent = true;
			toast.success('Code sent. Check your phone.');
		} catch (err) {
			toast.error(err?.message || 'Could not send code.');
		} finally {
			busy = false;
		}
	}

	async function verifyOtp() {
		if (busy) return;
		busy = true;
		try {
			const { error } = await authClient.phoneNumber.verify({ phoneNumber: phone, code: otp });
			if (error) {
				toast.error(error.message || 'Invalid code.');
				return;
			}
			await goto(next);
		} catch (err) {
			toast.error(err?.message || 'Invalid code.');
		} finally {
			busy = false;
		}
	}

	async function signInEmail() {
		if (busy) return;
		busy = true;
		try {
			if (useMagicLink) {
				const { error } = await authClient.signIn.magicLink({ email, callbackURL: next });
				if (error) {
					toast.error(error.message || 'Could not send sign-in link.');
					return;
				}
				toast.success('Check your email for a sign-in link.');
			} else {
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
			}
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
			<p class="text-[11px] uppercase tracking-[0.28em] text-sky-200">Workspace</p>
			<h1 class="mt-2 text-2xl font-semibold tracking-tight text-white">KH Rentals</h1>
			<p class="mt-1 text-sm text-sky-200/80">Sign in to your account</p>
		</div>

		<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
			<!-- Mode toggle -->
			<div class="flex rounded-2xl bg-white/5 p-1 mb-5">
				<button
					type="button"
					onclick={() => (mode = 'phone')}
					class="flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition {mode === 'phone' ? 'bg-white text-slate-950' : 'text-sky-200 hover:text-white'}"
				>
					Phone
				</button>
				<button
					type="button"
					onclick={() => (mode = 'email')}
					class="flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition {mode === 'email' ? 'bg-white text-slate-950' : 'text-sky-200 hover:text-white'}"
				>
					Email
				</button>
			</div>

			{#if mode === 'phone'}
				{#if !otpSent}
					<form onsubmit={(e) => { e.preventDefault(); sendOtp(); }} class="space-y-4">
						<label class="block">
							<span class="text-xs font-medium text-sky-200">Phone number</span>
							<input
								type="tel"
								bind:value={phone}
								required
								placeholder="0771234567"
								class="mt-1 block w-full rounded-2xl border-0 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-sky-300/50 focus:bg-white/15 focus:ring-2 focus:ring-sky-400 focus:outline-none"
							/>
						</label>
						<button
							type="submit"
							disabled={busy || !phone}
							class="w-full rounded-2xl bg-white py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-100 disabled:opacity-50"
						>
							{busy ? 'Sending…' : 'Send code'}
						</button>
					</form>
				{:else}
					<form onsubmit={(e) => { e.preventDefault(); verifyOtp(); }} class="space-y-4">
						<p class="text-sm text-sky-200">
							Enter the 6-digit code sent to <span class="text-white">{phone}</span>.
						</p>
						<label class="block">
							<span class="text-xs font-medium text-sky-200">Code</span>
							<input
								type="text"
								bind:value={otp}
								required
								inputmode="numeric"
								maxlength="6"
								placeholder="123456"
								class="mt-1 block w-full rounded-2xl border-0 bg-white/10 px-4 py-2.5 text-center text-lg tracking-[0.5em] text-white placeholder-sky-300/50 focus:bg-white/15 focus:ring-2 focus:ring-sky-400 focus:outline-none"
							/>
						</label>
						<button
							type="submit"
							disabled={busy || otp.length < 6}
							class="w-full rounded-2xl bg-white py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-100 disabled:opacity-50"
						>
							{busy ? 'Verifying…' : 'Verify and sign in'}
						</button>
						<button
							type="button"
							onclick={() => { otpSent = false; otp = ''; }}
							class="w-full text-xs text-sky-300 hover:text-white"
						>
							Use a different number
						</button>
					</form>
				{/if}
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); signInEmail(); }} class="space-y-4">
					<label class="block">
						<span class="text-xs font-medium text-sky-200">Email</span>
						<input
							type="email"
							bind:value={email}
							required
							placeholder="you@example.com"
							class="mt-1 block w-full rounded-2xl border-0 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-sky-300/50 focus:bg-white/15 focus:ring-2 focus:ring-sky-400 focus:outline-none"
						/>
					</label>

					{#if !useMagicLink}
						<label class="block">
							<span class="text-xs font-medium text-sky-200">Password</span>
							<input
								type="password"
								bind:value={password}
								required
								class="mt-1 block w-full rounded-2xl border-0 bg-white/10 px-4 py-2.5 text-sm text-white focus:bg-white/15 focus:ring-2 focus:ring-sky-400 focus:outline-none"
							/>
						</label>
					{/if}

					<button
						type="submit"
						disabled={busy || !email || (!useMagicLink && !password)}
						class="w-full rounded-2xl bg-white py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-100 disabled:opacity-50"
					>
						{busy ? 'Working…' : useMagicLink ? 'Email me a sign-in link' : 'Sign in'}
					</button>

					<button
						type="button"
						onclick={() => (useMagicLink = !useMagicLink)}
						class="w-full text-xs text-sky-300 hover:text-white"
					>
						{useMagicLink ? 'Use password instead' : 'Email me a sign-in link instead'}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
