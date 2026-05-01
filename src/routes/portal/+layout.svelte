<script>
	import { page } from '$app/stores';
	import { User, Receipt, FileText, LogOut, Menu, X } from 'lucide-svelte';

	let { children, data } = $props();
	let sidebarOpen = $state(false);

	const user = $derived(data.user);
	const org = $derived(data.org);

	$effect(() => {
		$page.url.pathname;
		sidebarOpen = false;
	});

	const isActive = (path) =>
		path === '/portal' ? $page.url.pathname === '/portal' : $page.url.pathname.startsWith(path);

	const navClass = (path) =>
		`flex items-center w-full rounded-2xl px-3 py-2.5 text-sm font-medium no-underline transition ${
			isActive(path)
				? 'bg-white text-slate-950 shadow-sm shadow-slate-950/5'
				: 'text-slate-200 hover:bg-white/10 hover:text-white'
		}`;

	const navItems = [
		{ path: '/portal', label: 'My Details', icon: User },
		{ path: '/portal/contract', label: 'My Contract', icon: FileText },
		{ path: '/portal/invoices', label: 'My Invoices', icon: Receipt }
	];

	const initial = $derived(
		(user?.name || user?.email || user?.contact_details?.phone || 'U').toString().charAt(0).toUpperCase()
	);
</script>

<div class="flex min-h-screen bg-transparent">
	<!-- Mobile menu button -->
	<div class="lg:hidden fixed top-0 left-0 z-50 m-2 sm:m-4">
		<button
			onclick={() => (sidebarOpen = true)}
			class="rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-sm"
		>
			<Menu class="h-5 w-5 sm:h-6 sm:w-6" />
		</button>
	</div>

	{#if sidebarOpen}
		<button
			class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
			onclick={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	{#snippet sidebarContent()}
		<div class="flex flex-col h-full">
			<div class="border-b border-white/10 p-4 sm:p-5">
				<p class="text-[11px] uppercase tracking-[0.28em] text-sky-200">Renter Portal</p>
				<h1 class="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">KH Rentals</h1>
			</div>

			<div class="border-b border-white/10 bg-white/5 p-3 sm:p-4 backdrop-blur-sm">
				<div class="flex items-start">
					<div class="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-400/20 text-sm font-semibold text-white sm:mr-3 sm:h-9 sm:w-9">
						{initial}
					</div>
					<div class="flex-1 min-w-0 overflow-hidden text-left">
						<p class="text-xs font-medium text-sky-200">Signed in</p>
						<p class="truncate text-xs font-medium leading-tight text-white sm:text-sm">
							{user?.name || user?.email || user?.contact_details?.phone || 'Renter'}
						</p>
					</div>
				</div>
				{#if org}
					<div class="mt-2 text-xs text-sky-300/80 truncate">{org.name}</div>
				{/if}
			</div>

			<div class="py-3 sm:py-4 px-2 sm:px-3 flex-1 overflow-y-auto">
				<nav class="space-y-1">
					{#each navItems as item}
						<a href={item.path} class={navClass(item.path)}>
							<svelte:component this={item.icon} class="h-4 w-4 mr-2.5" />
							{item.label}
						</a>
					{/each}
				</nav>
			</div>

			<div class="border-t border-white/10 p-3">
				<form method="POST" action="/logout">
					<button
						type="submit"
						class="flex items-center w-full rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition"
					>
						<LogOut class="h-4 w-4 mr-2.5" />
						Sign out
					</button>
				</form>
			</div>
		</div>
	{/snippet}

	<!-- Mobile sidebar -->
	<div class="fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-950 via-sky-950 to-blue-900 text-white transform {sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden overflow-hidden">
		<div class="absolute top-0 right-0 p-1 sm:p-2">
			<button onclick={() => (sidebarOpen = false)} class="rounded-2xl p-1.5 text-white hover:bg-white/10">
				<X class="h-5 w-5 sm:h-6 sm:w-6" />
			</button>
		</div>
		<div class="h-full overflow-hidden">
			{@render sidebarContent()}
		</div>
	</div>

	<!-- Desktop sidebar -->
	<div class="relative hidden h-screen w-72 flex-shrink-0 overflow-hidden bg-gradient-to-b from-slate-950 via-sky-950 to-blue-900 text-white shadow-2xl shadow-sky-950/10 lg:block">
		{@render sidebarContent()}
	</div>

	<!-- Main content -->
	<div class="flex-1 overflow-auto w-full lg:w-auto">
		<div class="mt-10 p-3 sm:p-4 md:p-6 lg:mt-0 lg:p-8">
			{@render children()}
		</div>
	</div>
</div>
