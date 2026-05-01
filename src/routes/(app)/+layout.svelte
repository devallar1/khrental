<script>
	import { page } from '$app/stores';
	import { Menu, X, Home, Building2, Users, FileText, Receipt, Wrench, Camera, UsersRound, Settings, ShieldCheck, LayoutDashboard, ChevronDown, ChevronUp, Crown, LogOut, PanelLeftClose, PanelLeft } from 'lucide-svelte';

	let { children, data } = $props();
	let sidebarOpen = $state(false);              // mobile slide-in drawer
	let sidebarCollapsed = $state(false);          // desktop narrow-bar mode
	let invoicesOpen = $state(false);
	let agreementsOpen = $state(false);

	const COLLAPSED_KEY = 'kh_sidebar_collapsed';
	$effect(() => {
		if (typeof window === 'undefined') return;
		try {
			sidebarCollapsed = localStorage.getItem(COLLAPSED_KEY) === '1';
		} catch {}
	});
	function toggleCollapsed() {
		sidebarCollapsed = !sidebarCollapsed;
		try { localStorage.setItem(COLLAPSED_KEY, sidebarCollapsed ? '1' : '0'); } catch {}
	}

	const user = $derived(data.user);
	const org = $derived(data.org);

	// Close mobile sidebar on navigation
	$effect(() => {
		$page.url.pathname;
		sidebarOpen = false;
	});

	// Auto-expand sections based on current route
	$effect(() => {
		if ($page.url.pathname.includes('/invoices')) invoicesOpen = true;
		if ($page.url.pathname.includes('/agreements')) agreementsOpen = true;
	});

	const isActive = (path) => {
		if (path === '/dashboard') return $page.url.pathname === '/dashboard';
		return $page.url.pathname.startsWith(path);
	};

	const navClass = (path) =>
		`flex items-center w-full rounded-2xl px-3 py-2.5 text-sm font-medium no-underline transition ${
			isActive(path)
				? 'bg-white text-slate-950 shadow-sm shadow-slate-950/5'
				: 'text-slate-200 hover:bg-white/10 hover:text-white'
		}`;

	const subNavClass = (path) =>
		`flex items-center w-full rounded-2xl px-3 py-2 text-sm font-medium no-underline transition ${
			isActive(path)
				? 'bg-white text-slate-950 shadow-sm shadow-slate-950/5'
				: 'text-slate-200 hover:bg-white/10 hover:text-white'
		}`;

	const navItems = [
		{ path: '/dashboard', label: 'Dashboard', icon: Home },
		{ path: '/manager', label: "Manager's Ledger", icon: Crown },
		{ path: '/properties', label: 'Properties', icon: Building2 },
		{ path: '/tenants', label: 'Tenants', icon: Users },
	];

	const bottomNavItems = [
		{ path: '/maintenance', label: 'Maintenance', icon: Wrench },
		{ path: '/cameras', label: 'Cameras', icon: Camera },
		{ path: '/team', label: 'Team', icon: UsersRound },
		{ path: '/settings', label: 'Settings', icon: Settings },
		{ path: '/tenant-admin', label: 'Tenant Admin', icon: ShieldCheck },
		{ path: '/admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
	];
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

	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<button
			class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
			onclick={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Sidebar. `compact` collapses to icon-only narrow mode for desktops. -->
	{#snippet sidebarContent(compact)}
		<div class="flex flex-col h-full">
			<div class="border-b border-white/10 {compact ? 'flex justify-center p-3' : 'p-4 sm:p-5'}">
				{#if compact}
					<div class="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm font-bold tracking-tight text-white">KH</div>
				{:else}
					<p class="text-[11px] uppercase tracking-[0.28em] text-sky-200">Workspace</p>
					<h1 class="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">KH Rentals</h1>
				{/if}
			</div>

			<!-- User info -->
			<div class="border-b border-white/10 bg-white/5 backdrop-blur-sm {compact ? 'flex justify-center p-2' : 'p-3 sm:p-4'}">
				<div class="flex {compact ? 'justify-center' : 'items-start'}">
					<div
						class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-400/20 text-sm font-semibold text-white {compact ? '' : 'mr-2 sm:mr-3 sm:h-9 sm:w-9'}"
						title={compact ? `${user?.role || 'User'} · ${user?.email || ''}` : ''}
					>
						{user?.email?.charAt(0)?.toUpperCase() || 'U'}
					</div>
					{#if !compact}
						<div class="flex-1 min-w-0 overflow-hidden text-left">
							<p class="text-xs font-medium capitalize text-sky-200">{user?.role || 'User'}</p>
							<p class="truncate text-xs font-medium leading-tight text-white sm:text-sm">{user?.email}</p>
						</div>
					{/if}
				</div>
				{#if org && !compact}
					<div class="mt-2 text-xs text-sky-300/80 truncate">
						{org.name}
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			<div class="flex-1 overflow-y-auto {compact ? 'py-2 px-1.5' : 'py-3 sm:py-4 px-2 sm:px-3'}">
				<nav class="space-y-1">
					{#each navItems as item}
						<a
							href={item.path}
							class={compact
								? `flex items-center justify-center rounded-xl p-2 transition ${isActive(item.path) ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`
								: navClass(item.path)}
							title={compact ? item.label : ''}
						>
							<svelte:component this={item.icon} class="h-4 w-4 {compact ? '' : 'mr-2.5'}" />
							{#if !compact}{item.label}{/if}
						</a>
					{/each}

					<!-- Agreements: accordion when expanded; direct link to /agreements when compact -->
					{#if compact}
						<a
							href="/agreements"
							class={`flex items-center justify-center rounded-xl p-2 transition ${isActive('/agreements') ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
							title="Agreements"
						>
							<FileText class="h-4 w-4" />
						</a>
					{:else}
						<div>
							<button
								onclick={() => (agreementsOpen = !agreementsOpen)}
								class="flex items-center justify-between w-full rounded-2xl px-3 py-2.5 text-sm font-medium transition {isActive('/agreements') || agreementsOpen ? 'bg-white/12 text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}"
							>
								<span class="flex items-center">
									<FileText class="h-4 w-4 mr-2.5" />
									Agreements
								</span>
								{#if agreementsOpen}
									<ChevronUp class="w-4 h-4" />
								{:else}
									<ChevronDown class="w-4 h-4" />
								{/if}
							</button>
							{#if agreementsOpen}
								<div class="mt-2 ml-3 space-y-1 border-l border-white/15 pl-3 py-1">
									<a href="/agreements" class={subNavClass('/agreements')}>All Agreements</a>
									<a href="/agreements/templates" class={subNavClass('/agreements/templates')}>Templates</a>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Invoices: accordion when expanded; direct link to /invoices when compact -->
					{#if compact}
						<a
							href="/invoices"
							class={`flex items-center justify-center rounded-xl p-2 transition ${isActive('/invoices') ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}
							title="Invoices"
						>
							<Receipt class="h-4 w-4" />
						</a>
					{:else}
						<div>
							<button
								onclick={() => (invoicesOpen = !invoicesOpen)}
								class="flex items-center justify-between w-full rounded-2xl px-3 py-2.5 text-sm font-medium transition {isActive('/invoices') || invoicesOpen ? 'bg-white/12 text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}"
							>
								<span class="flex items-center">
									<Receipt class="h-4 w-4 mr-2.5" />
									Invoices
								</span>
								{#if invoicesOpen}
									<ChevronUp class="w-4 h-4" />
								{:else}
									<ChevronDown class="w-4 h-4" />
								{/if}
							</button>
							{#if invoicesOpen}
								<div class="mt-2 ml-3 space-y-1 border-l border-white/15 pl-3 py-1">
									<a href="/invoices" class={subNavClass('/invoices')}>All Invoices</a>
									<a href="/invoices/generate" class={subNavClass('/invoices/generate')}>Generate</a>
									<a href="/invoices/batch-generate" class={subNavClass('/invoices/batch-generate')}>Batch Generate</a>
								</div>
							{/if}
						</div>
					{/if}

					{#each bottomNavItems as item}
						<a
							href={item.path}
							class={compact
								? `flex items-center justify-center rounded-xl p-2 transition ${isActive(item.path) ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`
								: navClass(item.path)}
							title={compact ? item.label : ''}
						>
							<svelte:component this={item.icon} class="h-4 w-4 {compact ? '' : 'mr-2.5'}" />
							{#if !compact}{item.label}{/if}
						</a>
					{/each}
				</nav>
			</div>

			<div class="border-t border-white/10 {compact ? 'p-2' : 'p-3'}">
				<form method="POST" action="/logout">
					<button
						type="submit"
						class={compact
							? 'flex w-full items-center justify-center rounded-xl p-2 text-slate-200 hover:bg-white/10 hover:text-white transition'
							: 'flex items-center w-full rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition'}
						title={compact ? 'Sign out' : ''}
					>
						<LogOut class="h-4 w-4 {compact ? '' : 'mr-2.5'}" />
						{#if !compact}Sign out{/if}
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
			{@render sidebarContent(false)}
		</div>
	</div>

	<!-- Desktop sidebar — width animates between 288px (full) and 64px (compact). -->
	<div
		class="relative hidden h-screen flex-shrink-0 overflow-hidden bg-gradient-to-b from-slate-950 via-sky-950 to-blue-900 text-white shadow-2xl shadow-sky-950/10 transition-[width] duration-200 ease-out lg:block {sidebarCollapsed ? 'w-16' : 'w-72'}"
	>
		{@render sidebarContent(sidebarCollapsed)}
		<!-- Collapse / expand toggle. Pinned to the inner edge of the sidebar. -->
		<button
			type="button"
			onclick={toggleCollapsed}
			class="absolute top-4 -right-3 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 lg:flex"
			title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			{#if sidebarCollapsed}
				<PanelLeft class="h-3.5 w-3.5" />
			{:else}
				<PanelLeftClose class="h-3.5 w-3.5" />
			{/if}
		</button>
	</div>

	<!-- Main content -->
	<div class="flex-1 overflow-auto w-full lg:w-auto">
		<div class="mt-10 p-3 sm:p-4 md:p-6 lg:mt-0 lg:p-8">
			{@render children()}
		</div>
	</div>
</div>
