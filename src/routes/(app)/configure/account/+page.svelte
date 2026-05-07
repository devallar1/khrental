<script>
	import { Settings, User, Building2, FileText } from 'lucide-svelte';

	let { data } = $props();

	const user = $derived(data.user);
	const org = $derived(data.org);
</script>

<svelte:head>
	<title>Settings - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-foreground sm:text-3xl">Settings</h1>
		<p class="mt-1 text-sm text-muted-foreground">Manage your account and workspace</p>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Current User -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-blue-500 p-2.5 text-white">
					<User class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-foreground">Your Account</h2>
			</div>
			<div class="space-y-3">
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Name</p>
					<p class="text-sm font-medium text-foreground">{user?.name || '-'}</p>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
					<p class="text-sm font-medium text-foreground">{user?.email || '-'}</p>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Role</p>
					<span class="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-700">
						{user?.role || '-'}
					</span>
				</div>
				<div>
					<p class="text-xs font-medium uppercase tracking-wide text-slate-400">User Type</p>
					<p class="text-sm font-medium capitalize text-foreground">{user?.user_type || '-'}</p>
				</div>
			</div>
		</div>

		<!-- Current Org -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div class="flex items-center gap-3 mb-4">
				<div class="rounded-xl bg-violet-500 p-2.5 text-white">
					<Building2 class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-foreground">Current Organization</h2>
			</div>
			{#if org}
				<div class="space-y-3">
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Name</p>
						<p class="text-sm font-medium text-foreground">{org.name}</p>
					</div>
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Slug</p>
						<p class="text-sm font-mono text-slate-600">{org.slug}</p>
					</div>
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Plan</p>
						<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-700">
							{org.plan || 'free'}
						</span>
					</div>
					<div>
						<p class="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
						<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-700">
							{org.status}
						</span>
					</div>
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No organization</p>
			{/if}
		</div>
	</div>

	<!-- Document Management -->
	<div class="mt-6">
		<a href="/configure/documents" class="block rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-slate-300 hover:shadow transition group">
			<div class="flex items-center gap-3 mb-2">
				<div class="rounded-xl bg-teal-500 p-2.5 text-white">
					<FileText class="h-5 w-5" />
				</div>
				<h2 class="text-lg font-semibold text-foreground group-hover:text-foreground">Document Management</h2>
			</div>
			<p class="text-sm text-muted-foreground">Upload, search, and manage documents via Paperless-ngx</p>
		</a>
	</div>

</div>
