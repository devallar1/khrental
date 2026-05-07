<script>
	import { Sun, Moon, Monitor } from 'lucide-svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';

	let { compact = false } = $props();

	// Cycle: light -> dark -> system -> light
	const next = { light: 'dark', dark: 'system', system: 'light' };
	const labelFor = { light: 'Light', dark: 'Dark', system: 'System' };
</script>

<button
	type="button"
	onclick={() => setMode(next[userPrefersMode.current] ?? 'system')}
	class={compact
		? 'flex w-full items-center justify-center rounded-xl p-2 text-slate-200 transition hover:bg-white/10 hover:text-white'
		: 'flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white'}
	title={compact ? `Theme: ${labelFor[userPrefersMode.current] ?? 'System'}` : ''}
	aria-label="Toggle theme"
>
	{#if userPrefersMode.current === 'light'}
		<Sun class="h-4 w-4 {compact ? '' : 'mr-2.5'}" />
	{:else if userPrefersMode.current === 'dark'}
		<Moon class="h-4 w-4 {compact ? '' : 'mr-2.5'}" />
	{:else}
		<Monitor class="h-4 w-4 {compact ? '' : 'mr-2.5'}" />
	{/if}
	{#if !compact}Theme: {labelFor[userPrefersMode.current] ?? 'System'}{/if}
</button>
