<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Error - KH Rentals</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-50">
	<div class="text-center px-4">
		<h1 class="text-6xl font-bold text-red-500">{$page.status}</h1>
		<h2 class="mt-4 text-xl font-semibold text-slate-900">
			{#if $page.status === 404}
				Page Not Found
			{:else}
				Something went wrong
			{/if}
		</h2>
		<p class="mt-2 text-slate-500">{$page.error?.message || 'An unexpected error occurred.'}</p>
		<div class="mt-6 flex gap-3 justify-center">
			<a href="/dashboard" class="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition">
				Go to Dashboard
			</a>
			<button onclick={() => history.back()} class="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
				Go Back
			</button>
		</div>
	</div>
</div>
