<script>
	import { BookUser } from 'lucide-svelte';

	// Active panel name. The parent maps a name → the matching drawer
	// component. `null` = nothing open.
	let { active = $bindable(null) } = $props();

	function toggle(name) {
		active = active === name ? null : name;
	}

	const buttons = [
		{ name: 'contacts', icon: BookUser, label: 'Tenant contact book' }
	];
</script>

<aside class="rail" aria-label="Manager controls">
	{#each buttons as b}
		{@const Icon = b.icon}
		<button
			type="button"
			class="rail-btn"
			class:active={active === b.name}
			onclick={() => toggle(b.name)}
			title={b.label}
			aria-pressed={active === b.name}
			aria-label={b.label}
		>
			<Icon class="h-5 w-5" />
		</button>
	{/each}
</aside>

<style>
	.rail {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 56px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 8px;
		background: hsl(var(--background) / 0.6);
		backdrop-filter: blur(8px);
		border-left: 1px solid hsl(var(--border));
		z-index: 15;
	}
	.rail-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		border: 1px solid transparent;
		background: transparent;
		color: hsl(var(--foreground) / 0.85);
		cursor: pointer;
		transition: background 100ms ease, color 100ms ease, border-color 100ms ease, box-shadow 100ms ease;
	}
	.rail-btn:hover {
		background: hsl(var(--card));
		color: hsl(var(--accent));
		border-color: hsl(var(--accent) / 0.3);
	}
	.rail-btn.active {
		background: hsl(var(--accent) / 0.15);
		color: hsl(var(--accent));
		border-color: hsl(var(--accent) / 0.5);
		box-shadow: 0 0 16px -4px hsl(var(--accent) / 0.4);
	}
</style>
