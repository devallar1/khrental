<script>
	import { UsersRound, Plus, Mail, Shield } from 'lucide-svelte';

	let { data } = $props();

	const members = $derived(data.members || []);

	const roleBadgeClass = (role) => {
		const map = {
			admin: 'bg-red-50 text-red-700',
			manager: 'bg-violet-50 text-violet-700',
			staff: 'bg-blue-50 text-blue-700'
		};
		return map[role] || 'bg-slate-50 text-slate-700';
	};
</script>

<svelte:head>
	<title>Team - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">Team</h1>
			<p class="mt-1 text-sm text-slate-500">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
		</div>
		<a
			href="/configure/team/new"
			class="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition"
		>
			<Plus class="h-4 w-4" />
			Add Team Member
		</a>
	</div>

	{#if members.length === 0}
		<div class="rounded-2xl border border-slate-200 bg-white p-12 text-center">
			<UsersRound class="mx-auto h-12 w-12 text-slate-300" />
			<h3 class="mt-4 text-sm font-medium text-slate-900">No team members</h3>
			<p class="mt-1 text-sm text-slate-500">Get started by adding a team member.</p>
			<a
				href="/configure/team/new"
				class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition"
			>
				<Plus class="h-4 w-4" />
				Add Team Member
			</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each members as member}
				<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
					<div class="flex items-start gap-3">
						<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
							{member.name?.charAt(0)?.toUpperCase() || '?'}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-semibold text-slate-900 truncate">{member.name || 'Unnamed'}</p>
							<div class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
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
						<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {member.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}">
							{member.active !== false ? 'Active' : 'Inactive'}
						</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
