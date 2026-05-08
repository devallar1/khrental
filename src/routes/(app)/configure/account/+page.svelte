<script>
	import { User, Building2, FileText, ChevronRight } from 'lucide-svelte';

	let { data } = $props();

	const user = $derived(data.user);
	const org = $derived(data.org);
</script>

<svelte:head>
	<title>Account — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<p class="kicker">Account</p>
		<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
			Settings
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">Manage your account and workspace.</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Current User -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-xl bg-primary p-2.5 text-primary-foreground">
					<User class="h-5 w-5" />
				</div>
				<h2 class="font-display text-base font-semibold">Your account</h2>
			</div>
			<dl class="space-y-3">
				<div>
					<dt class="kicker">Name</dt>
					<dd class="text-sm font-medium">{user?.name || '—'}</dd>
				</div>
				<div>
					<dt class="kicker">Email</dt>
					<dd class="text-sm font-medium">{user?.email || '—'}</dd>
				</div>
				<div>
					<dt class="kicker">Role</dt>
					<dd>
						<span class="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
							{user?.role || '—'}
						</span>
					</dd>
				</div>
				<div>
					<dt class="kicker">User type</dt>
					<dd class="text-sm font-medium capitalize">{user?.user_type || '—'}</dd>
				</div>
			</dl>
		</section>

		<!-- Current Org -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-xl bg-accent p-2.5 text-accent-foreground">
					<Building2 class="h-5 w-5" />
				</div>
				<h2 class="font-display text-base font-semibold">Current organization</h2>
			</div>
			{#if org}
				<dl class="space-y-3">
					<div>
						<dt class="kicker">Name</dt>
						<dd class="text-sm font-medium">{org.name}</dd>
					</div>
					<div>
						<dt class="kicker">Slug</dt>
						<dd class="font-mono text-sm text-muted-foreground">{org.slug}</dd>
					</div>
					<div>
						<dt class="kicker">Plan</dt>
						<dd>
							<span class="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium capitalize text-success">
								{org.plan || 'free'}
							</span>
						</dd>
					</div>
					<div>
						<dt class="kicker">Status</dt>
						<dd>
							<span class="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium capitalize text-success">
								{org.status}
							</span>
						</dd>
					</div>
				</dl>
			{:else}
				<p class="text-sm text-muted-foreground">No organization</p>
			{/if}
		</section>
	</div>

	<!-- Document Management -->
	<a
		href="/configure/documents"
		class="group block rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
	>
		<div class="flex items-center gap-3">
			<div class="rounded-xl bg-success p-2.5 text-success-foreground">
				<FileText class="h-5 w-5" />
			</div>
			<div class="flex-1">
				<h2 class="font-display text-base font-semibold">Document management</h2>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Upload, search, and manage documents via Paperless-ngx
				</p>
			</div>
			<ChevronRight class="h-4 w-4 text-muted-foreground transition-transform duration-200 ease-smooth group-hover:translate-x-0.5 group-hover:text-foreground" />
		</div>
	</a>
</div>
