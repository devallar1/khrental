<script>
	import { Mail, Phone, MapPin, IdCard, Building2, Check, AlertCircle } from 'lucide-svelte';

	let { data } = $props();
	const profile = $derived(data.profile);
	const properties = $derived(data.properties);

	const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
</script>

<svelte:head>
	<title>My Details — KH Rentals</title>
</svelte:head>

<div class="max-w-3xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-slate-900 sm:text-3xl">My Details</h1>
		<p class="mt-1 text-sm text-slate-500">Your account information on file with KH Rentals.</p>
	</div>

	<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex items-start gap-4 mb-6">
			<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-xl font-semibold text-sky-700">
				{(profile.name || profile.email || profile.phone || 'U').toString().charAt(0).toUpperCase()}
			</div>
			<div class="flex-1 min-w-0">
				<h2 class="text-lg font-semibold text-slate-900 truncate">{profile.name || 'Rentee'}</h2>
				<p class="text-sm text-slate-500 capitalize">{profile.role}</p>
				<p class="mt-1 text-xs text-slate-400">Member since {formatDate(profile.memberSince)}</p>
			</div>
		</div>

		<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
			<div>
				<dt class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
					<Mail class="w-3.5 h-3.5" /> Email
				</dt>
				<dd class="mt-1 text-sm text-slate-900 break-all">
					{profile.email || '—'}
					{#if profile.email}
						<span class="ml-2 inline-flex items-center gap-1 text-xs {profile.emailVerified ? 'text-emerald-600' : 'text-amber-600'}">
							{#if profile.emailVerified}
								<Check class="w-3 h-3" /> verified
							{:else}
								<AlertCircle class="w-3 h-3" /> unverified
							{/if}
						</span>
					{/if}
				</dd>
			</div>

			<div>
				<dt class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
					<Phone class="w-3.5 h-3.5" /> Phone
				</dt>
				<dd class="mt-1 text-sm text-slate-900">
					{profile.phone || '—'}
					{#if profile.phone}
						<span class="ml-2 inline-flex items-center gap-1 text-xs {profile.phoneVerified ? 'text-emerald-600' : 'text-amber-600'}">
							{#if profile.phoneVerified}
								<Check class="w-3 h-3" /> verified
							{:else}
								<AlertCircle class="w-3 h-3" /> unverified
							{/if}
						</span>
					{/if}
				</dd>
			</div>

			<div>
				<dt class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
					<IdCard class="w-3.5 h-3.5" /> National ID
				</dt>
				<dd class="mt-1 text-sm text-slate-900">{profile.national_id || '—'}</dd>
			</div>

			<div>
				<dt class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
					<MapPin class="w-3.5 h-3.5" /> Permanent address
				</dt>
				<dd class="mt-1 text-sm text-slate-900">{profile.permanent_address || '—'}</dd>
			</div>
		</dl>
	</div>

	{#if properties.length > 0}
		<div class="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4">
				<Building2 class="w-4 h-4 text-slate-500" />
				Associated properties
			</h2>
			<ul class="space-y-3">
				{#each properties as prop}
					<li class="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
						<div>
							<p class="text-sm font-medium text-slate-900">{prop.name}</p>
							<p class="text-xs text-slate-500">{prop.address || ''}</p>
						</div>
						{#if prop.propertytype}
							<span class="text-xs text-slate-500 capitalize">{prop.propertytype}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<p class="mt-6 text-xs text-slate-400">
		To change any of these details, please contact your property manager.
	</p>
</div>
