<script>
	import { Camera } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Cameras — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<p class="kicker">Cameras</p>
		<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
			Property monitoring
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">Live camera feeds and recordings.</p>
	</header>

	<div
		class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card py-16 text-center"
	>
		<div class="rounded-2xl bg-secondary p-5 text-muted-foreground">
			<Camera class="h-8 w-8" />
		</div>
		<p class="mt-4 font-display text-xl font-semibold">Coming soon</p>
		<p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
			Camera integration and live monitoring will be available in a future update.
		</p>
	</div>
</div>
