<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	let { form } = $props();

	let submitting = $state(false);
</script>

<svelte:head>
	<title>New Template - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6">
		<a
			href="/configure/agreement-templates"
			class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-700"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Templates
		</a>
		<h1 class="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">New Template</h1>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
		class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
	>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<!-- Name -->
			<div class="sm:col-span-2">
				<label for="name" class="block text-sm font-medium text-slate-700">Name <span class="text-red-500">*</span></label>
				<input
					type="text"
					id="name"
					name="name"
					value={form?.name || ''}
					required
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="Template name"
				/>
			</div>

			<!-- Language -->
			<div>
				<label for="language" class="block text-sm font-medium text-slate-700">Language</label>
				<input
					type="text"
					id="language"
					name="language"
					value={form?.language || 'English'}
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="English"
				/>
			</div>

			<!-- Version -->
			<div>
				<label for="version" class="block text-sm font-medium text-slate-700">Version</label>
				<input
					type="text"
					id="version"
					name="version"
					value={form?.version || '1.0'}
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="1.0"
				/>
			</div>

			<!-- Content -->
			<div class="sm:col-span-2">
				<label for="content" class="block text-sm font-medium text-slate-700">Content</label>
				<textarea
					id="content"
					name="content"
					rows="12"
					class="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
					placeholder="Agreement template content..."
				>{form?.content || ''}</textarea>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
			<a
				href="/configure/agreement-templates"
				class="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting}
				class="rounded-2xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
			>
				{submitting ? 'Creating...' : 'Create Template'}
			</button>
		</div>
	</form>
</div>
