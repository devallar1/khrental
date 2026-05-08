<script>
	import { UsersRound, Plus, Mail, Shield } from 'lucide-svelte';

	let { data } = $props();

	const members = $derived(data.members || []);

	const roleBadgeClass = (role) => {
		const map = {
			admin: 'bg-destructive/15 text-destructive',
			manager: 'bg-accent/15 text-accent',
			staff: 'bg-primary/15 text-primary'
		};
		return map[role] || 'bg-muted text-muted-foreground';
	};
</script>

<svelte:head>
	<title>Team - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground sm:text-3xl">Team</h1>
			<p class="mt-1 text-sm text-muted-foreground">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
		</div>
		<a
			href="/configure/team/new"
			class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
		>
			<Plus class="h-4 w-4" />
			Add Team Member
		</a>
	</div>

	{#if members.length === 0}
		<div class="rounded-2xl border border-border bg-card p-12 text-center">
			<UsersRound class="mx-auto h-12 w-12 text-muted-foreground" />
			<h3 class="mt-4 text-sm font-medium text-foreground">No team members</h3>
			<p class="mt-1 text-sm text-muted-foreground">Get started by adding a team member.</p>
			<a
				href="/configure/team/new"
				class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
			>
				<Plus class="h-4 w-4" />
				Add Team Member
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each members as member}
				<div class="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
							{member.name?.charAt(0)?.toUpperCase() || '?'}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-semibold text-foreground truncate">{member.name || 'Unnamed'}</p>
							<div class="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
								<Mail class="h-3 w-3" />
								<span class="truncate">{member.email}</span>
							</div>
						</div>
					</div>
					<div class="mt-4 flex items-center justify-between">
						<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {roleBadgeClass(member.role)}">
							<Shield class="h-3 w-3" />
							{member.role || member.user_type}
						</span>
						<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {member.active !== false ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}">
							{member.active !== false ? 'Active' : 'Inactive'}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
