<script>
	import { LayoutDashboard, Server, Database } from 'lucide-svelte';

	let { data } = $props();

	const org = $derived(data.org);
	const user = $derived(data.user);
	const isDevBypass = $derived(Boolean(user?.is_dev_bypass));
</script>

<svelte:head>
	<title>Admin — KH Rentals</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<p class="kicker">Admin</p>
		<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
			System
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">Platform info and active tenant.</p>
	</header>

	<div class="grid gap-6 lg:grid-cols-2">
		<!-- System Info -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-xl bg-primary p-2.5 text-primary-foreground">
					<Server class="h-5 w-5" />
				</div>
				<h2 class="font-display text-base font-semibold">System info</h2>
			</div>
			<dl class="space-y-2">
				<div class="flex items-center justify-between border-b border-border py-2">
					<dt class="text-sm text-muted-foreground">Platform</dt>
					<dd class="text-sm font-medium">SvelteKit</dd>
				</div>
				<div class="flex items-center justify-between border-b border-border py-2">
					<dt class="text-sm text-muted-foreground">Database</dt>
					<dd class="text-sm font-medium">PostgreSQL</dd>
				</div>
				<div class="flex items-center justify-between py-2">
					<dt class="text-sm text-muted-foreground">Auth mode</dt>
					<dd>
						{#if isDevBypass}
							<span class="inline-flex rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning">
								Dev bypass
							</span>
						{:else}
							<span class="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
								Better-Auth
							</span>
						{/if}
					</dd>
				</div>
			</dl>
		</section>

		<!-- Current Tenant -->
		<section class="rounded-2xl border border-border bg-card p-6 glow-primary">
			<div class="mb-4 flex items-center gap-3">
				<div class="rounded-xl bg-accent p-2.5 text-accent-foreground">
					<Database class="h-5 w-5" />
				</div>
				<h2 class="font-display text-base font-semibold">Active tenant</h2>
			</div>
			{#if org}
				<dl class="space-y-2">
					<div class="flex items-center justify-between border-b border-border py-2">
						<dt class="text-sm text-muted-foreground">Name</dt>
						<dd class="text-sm font-medium">{org.name}</dd>
					</div>
					<div class="flex items-center justify-between border-b border-border py-2">
						<dt class="text-sm text-muted-foreground">Slug</dt>
						<dd class="font-mono text-sm text-muted-foreground">{org.slug}</dd>
					</div>
					<div class="flex items-center justify-between border-b border-border py-2">
						<dt class="text-sm text-muted-foreground">Plan</dt>
						<dd>
							<span class="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium capitalize text-success">
								{org.plan || 'free'}
							</span>
						</dd>
					</div>
					<div class="flex items-center justify-between py-2">
						<dt class="text-sm text-muted-foreground">Status</dt>
						<dd>
							<span class="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium capitalize text-success">
								{org.status}
							</span>
						</dd>
					</div>
				</dl>
			{:else}
				<p class="text-sm text-muted-foreground">No organization</p>
			{/if}
		</section>

		<!-- Placeholder -->
		<div class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card py-12 text-center lg:col-span-2">
			<div class="rounded-2xl bg-secondary p-4 text-muted-foreground">
				<LayoutDashboard class="h-6 w-6" />
			</div>
			<p class="mt-4 font-display text-lg font-semibold">Coming soon</p>
			<p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
				Advanced analytics, audit logs, and system monitoring will be available here.
			</p>
		</div>
	</div>
</div>
