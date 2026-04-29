<script>
	import { Camera } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Cameras - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Cameras</h1>
		<p class="mt-1 text-sm text-slate-500">Property camera monitoring</p>
	</div>

	<div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
		<Camera class="mx-auto h-16 w-16 text-slate-300" />
		<h3 class="mt-4 text-lg font-semibold text-slate-900">Coming Soon</h3>
		<p class="mt-2 text-sm text-slate-500 max-w-md mx-auto">
			Camera integration and live monitoring will be available in a future update.
		</p>
	</div>
</div>
