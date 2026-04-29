<script>
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	let { data, form } = $props();

	let loading = $state(false);

	const rentee = $derived(data.rentee);
</script>

<svelte:head>
	<title>Edit {rentee.name || 'Rentee'} - KH Rentals</title>
</svelte:head>

<div>
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<a
			href="/rentees/{rentee.id}"
			class="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
		>
			<ArrowLeft class="h-4 w-4" />
		</a>
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Edit Rentee</h1>
			<p class="mt-0.5 text-sm text-slate-500">{rentee.name}</p>
		</div>
	</div>

	<!-- Form -->
	<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		{#if form?.error}
			<div class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label for="name" class="block text-sm font-medium text-slate-700">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						value={form?.name ?? rentee.name ?? ''}
						class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
						placeholder="Full name"
					/>
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-slate-700">Email</label>
					<input
						type="email"
						id="email"
						name="email"
						value={form?.email ?? rentee.email ?? ''}
						class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
						placeholder="email@example.com"
					/>
				</div>

				<div>
					<label for="phone" class="block text-sm font-medium text-slate-700">Phone</label>
					<input
						type="tel"
						id="phone"
						name="phone"
						value={form?.phone ?? data.phone ?? ''}
						class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
						placeholder="+1 234 567 890"
					/>
				</div>

				<div>
					<label for="national_id" class="block text-sm font-medium text-slate-700">National ID</label>
					<input
						type="text"
						id="national_id"
						name="national_id"
						value={form?.national_id ?? rentee.national_id ?? ''}
						class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
						placeholder="ID number"
					/>
				</div>

				<div>
					<label for="permanent_address" class="block text-sm font-medium text-slate-700">Permanent Address</label>
					<input
						type="text"
						id="permanent_address"
						name="permanent_address"
						value={form?.permanent_address ?? rentee.permanent_address ?? ''}
						class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
						placeholder="Home address"
					/>
				</div>

				<div class="sm:col-span-2">
					<label for="notes" class="block text-sm font-medium text-slate-700">Notes</label>
					<textarea
						id="notes"
						name="notes"
						rows="3"
						class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
						placeholder="Additional notes..."
					>{form?.notes ?? rentee.notes ?? ''}</textarea>
				</div>

				<div class="sm:col-span-2">
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							name="active"
							checked={form?.active ?? rentee.active ?? true}
							class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
						/>
						<span class="text-sm font-medium text-slate-700">Active</span>
					</label>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-end gap-3">
				<a
					href="/rentees/{rentee.id}"
					class="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={loading}
					class="rounded-2xl bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
				>
					{loading ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</form>
	</div>
</div>
