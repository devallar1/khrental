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
			class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Templates
		</a>
		<h1 class="mt-3 text-2xl font-bold text-foreground sm:text-3xl">New Template</h1>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
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
		class="rounded-2xl border border-border bg-card p-6 shadow-sm"
	>
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			<!-- Name -->
			<div class="sm:col-span-2">
				<label for="name" class="block text-sm font-medium text-foreground">Name <span class="text-destructive">*</span></label>
				<input
					type="text"
					id="name"
					name="name"
					value={form?.name || ''}
					required
					class="mt-1 block w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Template name"
				/>
			</div>

			<!-- Language -->
			<div>
				<label for="language" class="block text-sm font-medium text-foreground">Language</label>
				<input
					type="text"
					id="language"
					name="language"
					value={form?.language || 'English'}
					class="mt-1 block w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="English"
				/>
			</div>

			<!-- Version -->
			<div>
				<label for="version" class="block text-sm font-medium text-foreground">Version</label>
				<input
					type="text"
					id="version"
					name="version"
					value={form?.version || '1.0'}
					class="mt-1 block w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="1.0"
				/>
			</div>

			<!-- Content -->
			<div class="sm:col-span-2">
				<label for="content" class="block text-sm font-medium text-foreground">Content</label>
				<textarea
					id="content"
					name="content"
					rows="12"
					class="mt-1 block w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Agreement template content..."
				>{form?.content || ''}</textarea>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-6">
			<a
				href="/configure/agreement-templates"
				class="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={submitting}
				class="rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary disabled:opacity-50"
			>
				{submitting ? 'Creating...' : 'Create Template'}
			</button>
		</div>
	</form>
</div>
