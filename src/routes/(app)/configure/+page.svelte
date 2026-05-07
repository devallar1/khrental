<script>
	import {
		UserCog,
		Users,
		ShieldCheck,
		Server,
		Wallet,
		FileSignature,
		FileText,
		ChevronRight
	} from 'lucide-svelte';

	let { data } = $props();
	const isDevBypass = $derived(Boolean(data?.user?.is_dev_bypass));

	const sections = [
		{
			path: '/configure/account',
			label: 'Account',
			desc: 'Your profile, workspace settings, and preferences.',
			icon: UserCog,
			tone: 'primary'
		},
		{
			path: '/configure/team',
			label: 'Team',
			desc: 'Manage members, roles, and access.',
			icon: Users,
			tone: 'accent'
		},
		{
			path: '/configure/organizations',
			label: 'Organizations',
			desc: 'Orgs and memberships across the workspace.',
			icon: ShieldCheck,
			tone: 'success'
		},
		{
			path: '/configure/bank-profiles',
			label: 'Bank profiles',
			desc: 'Bank accounts that invoices are drawn against.',
			icon: Wallet,
			tone: 'primary'
		},
		{
			path: '/configure/agreement-templates',
			label: 'Agreement templates',
			desc: 'Reusable templates for new agreements.',
			icon: FileSignature,
			tone: 'accent'
		},
		{
			path: '/configure/documents',
			label: 'Documents',
			desc: 'Document storage, policies, and uploads.',
			icon: FileText,
			tone: 'success'
		},
		{
			path: '/configure/admin',
			label: 'Admin',
			desc: 'System info, platform, and active tenant.',
			icon: Server,
			tone: 'destructive',
			adminOnly: true
		}
	];
</script>

<svelte:head>
	<title>Configure - KH Rentals</title>
</svelte:head>

<div class="space-y-8">
	<header>
		<p class="kicker">Configure</p>
		<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
			Workspace setup
		</h1>
		<p class="mt-2 max-w-2xl text-sm text-muted-foreground">
			Account, team, organizations, billing profiles, and templates. These settings change rarely
			— that's why they're collapsed under one section.
		</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each sections as section}
			<a
				href={section.path}
				class="group rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1"
			>
				<div class="flex items-start gap-3">
					{#if section.tone === 'primary'}
						<div class="flex-shrink-0 rounded-xl bg-primary p-2.5 text-primary-foreground">
							<svelte:component this={section.icon} class="h-5 w-5" />
						</div>
					{:else if section.tone === 'accent'}
						<div class="flex-shrink-0 rounded-xl bg-accent p-2.5 text-accent-foreground">
							<svelte:component this={section.icon} class="h-5 w-5" />
						</div>
					{:else if section.tone === 'success'}
						<div class="flex-shrink-0 rounded-xl bg-success p-2.5 text-success-foreground">
							<svelte:component this={section.icon} class="h-5 w-5" />
						</div>
					{:else}
						<div class="flex-shrink-0 rounded-xl bg-destructive p-2.5 text-destructive-foreground">
							<svelte:component this={section.icon} class="h-5 w-5" />
						</div>
					{/if}
					<div class="flex-1 min-w-0">
						<h3 class="font-display text-lg font-semibold tracking-tight">
							{section.label}
							{#if section.adminOnly && isDevBypass}
								<span
									class="ml-1.5 inline-flex rounded-full bg-warning/20 px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning"
								>
									dev
								</span>
							{/if}
						</h3>
						<p class="mt-1 text-xs text-muted-foreground">{section.desc}</p>
					</div>
					<ChevronRight
						class="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ease-smooth group-hover:translate-x-0.5 group-hover:text-foreground"
					/>
				</div>
			</a>
		{/each}
	</div>
</div>
