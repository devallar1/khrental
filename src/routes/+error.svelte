<script>
	import { page } from '$app/stores';
	import { ArrowLeft, Home } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Error — KH Rentals</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<div class="text-center">
		<p class="font-mono text-7xl font-bold text-destructive">{$page.status}</p>
		<h2 class="mt-4 font-display text-2xl font-semibold tracking-tight">
			{#if $page.status === 404}
				Page not found
			{:else}
				Something went wrong
			{/if}
		</h2>
		<p class="mt-2 text-sm text-muted-foreground">
			{$page.error?.message || 'An unexpected error occurred.'}
		</p>
		<div class="mt-6 flex justify-center gap-3">
			<button
				onclick={() => history.back()}
				class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
			>
				<ArrowLeft class="h-4 w-4" />
				Go back
			</button>
			<a
				href="/"
				class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Home class="h-4 w-4" />
				Home
			</a>
		</div>
	</div>
</div>
