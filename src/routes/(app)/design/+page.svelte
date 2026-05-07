<script>
	import {
		Plus,
		Trash2,
		Search,
		Bell,
		Check,
		ChevronRight,
		Loader2,
		Sparkles,
		Sun,
		Moon,
		Monitor,
		Building2,
		Users,
		BookUser,
		User,
		RotateCw,
		Wrench,
		ArrowLeft,
		AlertTriangle,
		Receipt,
		Mail,
		Phone,
		Inbox
	} from 'lucide-svelte';
	import { setMode, userPrefersMode, setTheme, theme } from 'mode-watcher';

	let cardFlipped = $state(false);
	let railActive = $state('contacts');

	const themes = [
		{ value: 'ocean', label: 'Ocean', from: '220 75% 40%', to: '195 82% 48%' },
		{ value: 'editorial', label: 'Editorial', from: '0 0% 12%', to: '185 90% 48%' },
		{ value: 'sunset', label: 'Sunset', from: '18 75% 42%', to: '8 80% 52%' }
	];

	// theme.current is '' on first load (no theme set); treat that as 'ocean'.
	const activeTheme = $derived(theme.current || 'ocean');

	const tokens = [
		{ name: 'background', fg: 'foreground' },
		{ name: 'card', fg: 'card-foreground' },
		{ name: 'popover', fg: 'popover-foreground' },
		{ name: 'primary', fg: 'primary-foreground' },
		{ name: 'secondary', fg: 'secondary-foreground' },
		{ name: 'muted', fg: 'muted-foreground' },
		{ name: 'accent', fg: 'accent-foreground' },
		{ name: 'destructive', fg: 'destructive-foreground' },
		{ name: 'warning', fg: 'warning-foreground' },
		{ name: 'success', fg: 'success-foreground' },
		{ name: 'border', fg: null },
		{ name: 'input', fg: null },
		{ name: 'ring', fg: null }
	];

	const modes = [
		{ value: 'light', icon: Sun, label: 'Light' },
		{ value: 'dark', icon: Moon, label: 'Dark' },
		{ value: 'system', icon: Monitor, label: 'System' }
	];

	let textValue = $state('');
	let textareaValue = $state('');
	let selectValue = $state('option-a');
	let checkboxValue = $state(true);
	let radioValue = $state('one');
	let switchValue = $state(false);
</script>

<div class="space-y-12 pb-24">
	<!-- Header -->
	<header class="space-y-3">
		<p class="kicker">Design lab</p>
		<h1 class="font-display text-4xl font-semibold tracking-tight">UI vocabulary preview</h1>
		<p class="max-w-2xl text-muted-foreground">
			Every token, idiom, and component used by the unified UI lives here. Toggle theme below to
			compare light and dark before propagating to the rest of the app.
		</p>

		<!-- Quick mode + theme switchers (in addition to the sidebar one) -->
		<div class="flex flex-wrap items-center gap-3">
			<!-- Mode (light / dark / system) -->
			<div class="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1">
				{#each modes as m}
					<button
						type="button"
						onclick={() => setMode(m.value)}
						class={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${userPrefersMode.current === m.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
					>
						<svelte:component this={m.icon} class="h-4 w-4" />
						{m.label}
					</button>
				{/each}
			</div>

			<!-- Theme (ocean / forest / sunset) -->
			<div class="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1">
				{#each themes as t}
					<button
						type="button"
						onclick={() => setTheme(t.value)}
						class={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${activeTheme === t.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
					>
						<span
							class="inline-block h-4 w-4 rounded-full ring-1 ring-border/50"
							style={`background: linear-gradient(135deg, hsl(${t.from}) 0%, hsl(${t.to}) 100%);`}
						></span>
						{t.label}
					</button>
				{/each}
			</div>
		</div>
	</header>

	<!-- Palette -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 01</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Palette</h2>
			<p class="text-sm text-muted-foreground">Semantic tokens and their on-color pair.</p>
		</div>
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
			{#each tokens as t}
				<div class="overflow-hidden rounded-2xl border border-border bg-card">
					<div
						class="flex h-20 items-end justify-between p-3"
						style={`background-color: hsl(var(--${t.name}));`}
					>
						{#if t.fg}
							<span
								class="text-xs font-medium"
								style={`color: hsl(var(--${t.fg}));`}>Aa</span
							>
						{/if}
						<span
							class="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-mono text-white backdrop-blur-sm"
						>
							var(--{t.name})
						</span>
					</div>
					<div class="border-t border-border px-3 py-2">
						<div class="text-sm font-medium">{t.name}</div>
						{#if t.fg}
							<div class="text-[11px] text-muted-foreground">on: {t.fg}</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Typography -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 02</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Typography</h2>
			<p class="text-sm text-muted-foreground">
				{#if activeTheme === 'editorial'}
					Bodoni Moda for display, Libre Baskerville for body, Pirata One for blackletter accents.
				{:else}
					Inter Tight for body, JetBrains Mono for display + numerics.
				{/if}
			</p>
		</div>
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-2xl border border-border bg-card p-6">
				<p class="kicker mb-2">
					Display · {activeTheme === 'editorial' ? 'Bodoni Moda' : 'JetBrains Mono'}
				</p>
				<h1 class="font-display text-5xl font-semibold tracking-tight">
					Manager's Ledger
				</h1>
				<h2 class="mt-3 font-display text-3xl font-medium">Section heading</h2>
				<h3 class="mt-2 font-display text-xl font-medium">Sub-heading</h3>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6">
				<p class="kicker mb-2">
					Body · {activeTheme === 'editorial' ? 'Libre Baskerville' : 'Inter Tight'}
				</p>
				<p class="text-base">
					The quick brown fox jumps over the lazy dog. Tenants moved in on the first of the month
					and the agreement was signed in triplicate.
				</p>
				<p class="mt-3 text-sm text-muted-foreground">
					Muted secondary copy — used for help text, captions, and timestamps.
				</p>
				<p class="mt-3 text-xs">XS for fine print and labels.</p>
			</div>
			{#if activeTheme === 'editorial'}
				<div class="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
					<p class="kicker mb-2">Accent · Pirata One (Blackletter)</p>
					<p class="font-blackletter text-5xl leading-tight">Manager's Ledger</p>
					<p class="font-blackletter mt-3 text-2xl">A · XII · MMXXVI</p>
					<p class="mt-4 text-xs text-muted-foreground">
						Use sparingly — drop caps, chapter markers, decorative section dividers.
						<code class="font-mono">font-blackletter</code> Tailwind utility.
					</p>
				</div>
			{/if}
			<div class="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
				<p class="kicker mb-2">Numeric · JetBrains Mono</p>
				<div class="flex flex-wrap items-baseline gap-x-8 gap-y-3">
					<div>
						<p class="text-xs text-muted-foreground">Rent</p>
						<p class="font-mono text-3xl font-semibold tracking-tight">Rs. 24,500</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Outstanding</p>
						<p class="font-mono text-3xl font-semibold tracking-tight text-destructive">
							Rs. 7,200
						</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Occupancy</p>
						<p class="font-mono text-3xl font-semibold tracking-tight text-success">
							96.4%
						</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Units</p>
						<p class="font-mono text-3xl font-semibold tracking-tight">128 / 133</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Buttons -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 03</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Buttons</h2>
			<p class="text-sm text-muted-foreground">Primary uses gradient + glow on hover.</p>
		</div>
		<div class="rounded-2xl border border-border bg-card p-6">
			<div class="space-y-6">
				<div>
					<p class="kicker mb-3">Primary · 200ms snap</p>
					<div class="flex flex-wrap gap-3">
						<button
							class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
						>
							<Plus class="h-4 w-4" />
							New tenant
						</button>
						<button
							class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
						>
							Small
						</button>
						<button
							class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-5 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary-strong"
						>
							<Sparkles class="h-5 w-5" />
							Large
						</button>
						<button
							disabled
							class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground opacity-50"
						>
							<Loader2 class="h-4 w-4 animate-spin" />
							Loading
						</button>
					</div>
				</div>

				<div>
					<p class="kicker mb-3">Secondary · 200ms</p>
					<div class="flex flex-wrap gap-3">
						<button
							class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
						>
							Edit
						</button>
						<button
							class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-secondary"
						>
							<Search class="h-4 w-4" />
							Filter
						</button>
					</div>
				</div>

				<div>
					<p class="kicker mb-3">Ghost · 200ms</p>
					<div class="flex flex-wrap gap-3">
						<button
							class="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 ease-smooth hover:bg-secondary hover:text-foreground"
						>
							Cancel
						</button>
						<button
							class="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 ease-smooth hover:bg-secondary hover:text-foreground"
						>
							View all
							<ChevronRight class="h-4 w-4 transition-transform duration-200 ease-smooth group-hover:translate-x-0.5" />
						</button>
					</div>
				</div>

				<div>
					<p class="kicker mb-3">Destructive · 200ms</p>
					<div class="flex flex-wrap gap-3">
						<button
							class="inline-flex items-center gap-2 rounded-2xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:opacity-90 hover:shadow-[0_8px_24px_hsl(var(--destructive)/0.4)]"
						>
							<Trash2 class="h-4 w-4" />
							Delete
						</button>
						<button
							class="inline-flex items-center gap-2 rounded-2xl border border-destructive/30 bg-card px-4 py-2.5 text-sm font-semibold text-destructive transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-destructive/10"
						>
							<Trash2 class="h-4 w-4" />
							Delete (subtle)
						</button>
					</div>
				</div>

				<div>
					<p class="kicker mb-3">Icon-only · 200ms</p>
					<div class="flex flex-wrap gap-3">
						<button
							class="rounded-2xl border border-border bg-card p-2.5 text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
							aria-label="Notifications"
						>
							<Bell class="h-5 w-5" />
						</button>
						<button
							class="rounded-2xl bg-gradient-to-r from-primary to-accent p-2.5 text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary-strong"
							aria-label="Add"
						>
							<Plus class="h-5 w-5" />
						</button>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Inputs -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 04</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Inputs</h2>
		</div>
		<div class="rounded-2xl border border-border bg-card p-6">
			<div class="grid gap-5 md:grid-cols-2">
				<label class="block">
					<span class="mb-1.5 block text-sm font-medium">Text input</span>
					<input
						type="text"
						bind:value={textValue}
						placeholder="Tenant name"
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
					/>
				</label>

				<label class="block">
					<span class="mb-1.5 block text-sm font-medium">Select</span>
					<select
						bind:value={selectValue}
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					>
						<option value="option-a">Option A</option>
						<option value="option-b">Option B</option>
						<option value="option-c">Option C</option>
					</select>
				</label>

				<label class="block md:col-span-2">
					<span class="mb-1.5 block text-sm font-medium">Textarea</span>
					<textarea
						bind:value={textareaValue}
						rows="3"
						placeholder="Notes"
						class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					></textarea>
				</label>

				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-destructive">
						With error
					</span>
					<input
						type="text"
						value="invalid@"
						class="w-full rounded-2xl border border-destructive bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
					/>
					<p class="mt-1.5 text-xs text-destructive">Please enter a valid email.</p>
				</label>

				<label class="block">
					<span class="mb-1.5 block text-sm font-medium text-muted-foreground">
						Disabled
					</span>
					<input
						type="text"
						value="Locked"
						disabled
						class="w-full cursor-not-allowed rounded-2xl border border-input bg-muted px-3.5 py-2.5 text-sm text-muted-foreground"
					/>
				</label>

				<div class="md:col-span-2 flex flex-wrap items-center gap-6 pt-2">
					<label class="inline-flex items-center gap-2.5 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={checkboxValue}
							class="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
						/>
						<span class="text-sm">Checkbox</span>
					</label>

					<label class="inline-flex items-center gap-2.5 cursor-pointer">
						<input
							type="radio"
							name="demo-radio"
							value="one"
							bind:group={radioValue}
							class="h-4 w-4 border-input text-primary focus:ring-2 focus:ring-ring"
						/>
						<span class="text-sm">Radio one</span>
					</label>
					<label class="inline-flex items-center gap-2.5 cursor-pointer">
						<input
							type="radio"
							name="demo-radio"
							value="two"
							bind:group={radioValue}
							class="h-4 w-4 border-input text-primary focus:ring-2 focus:ring-ring"
						/>
						<span class="text-sm">Radio two</span>
					</label>

					<button
						type="button"
						onclick={() => (switchValue = !switchValue)}
						class={`relative inline-flex h-6 w-11 items-center rounded-full transition ${switchValue ? 'bg-primary' : 'bg-muted'}`}
						aria-label="Toggle switch"
					>
						<span
							class={`inline-block h-4 w-4 transform rounded-full bg-white transition ${switchValue ? 'translate-x-6' : 'translate-x-1'}`}
						></span>
					</button>
					<span class="text-sm text-muted-foreground">Switch ({switchValue ? 'on' : 'off'})</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Cards -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 05</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Cards & surfaces</h2>
		</div>
		<div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
			<!-- Plain card · 400ms deliberate · AO at rest, lightens on hover -->
			<div class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1">
				<p class="kicker mb-2">Plain · 400ms</p>
				<h3 class="font-display text-xl font-semibold">Tenant: A. Khan</h3>
				<p class="mt-1 text-sm text-muted-foreground">Unit 12 · Block C · joined 2024-03-01</p>
			</div>

			<!-- Stat card · 400ms -->
			<div class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1">
				<p class="kicker mb-2">Outstanding</p>
				<p class="font-mono text-4xl font-semibold tracking-tight">Rs. 12,400</p>
				<p class="mt-2 text-xs text-muted-foreground">3 invoices overdue</p>
			</div>

			<!-- List card with status · 400ms -->
			<div class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1">
				<div class="flex items-start justify-between">
					<div>
						<p class="kicker mb-1">Agreement · 400ms</p>
						<h3 class="font-display text-lg font-semibold">Block A — Unit 04</h3>
						<p class="mt-1 text-xs text-muted-foreground">Renews 2026-09-30</p>
					</div>
					<span
						class="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success"
						>Active</span
					>
				</div>
			</div>

			<!-- Gradient hero card · 400ms · stronger AO at rest -->
			<div
				class="md:col-span-2 lg:col-span-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-6 glow-primary-strong transition-all duration-400 ease-smooth hover:-translate-y-1"
			>
				<div class="flex flex-wrap items-center justify-between gap-6">
					<div>
						<p class="kicker">Featured · 400ms · glow-primary-strong on hover</p>
						<h3 class="mt-1 font-display text-3xl font-semibold tracking-tight">
							Welcome back, Manager
						</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							3 new agreements pending signature · 7 invoices generated this morning.
						</p>
					</div>
					<div class="flex gap-3">
						<button
							class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
						>
							View ledger
						</button>
						<button
							class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
						>
							<Plus class="h-4 w-4" />
							New agreement
						</button>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Status badges -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 06</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Status badges</h2>
		</div>
		<div class="rounded-2xl border border-border bg-card p-6">
			<div class="flex flex-wrap gap-2.5">
				<span
					class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success"
				>
					<Check class="h-3 w-3" /> Paid
				</span>
				<span
					class="inline-flex rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning"
				>
					Pending
				</span>
				<span
					class="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive"
				>
					Overdue
				</span>
				<span
					class="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
				>
					Draft
				</span>
				<span
					class="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
				>
					Active
				</span>
				<span
					class="inline-flex rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
				>
					Inactive
				</span>
			</div>
		</div>
	</section>

	<!-- Table -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 07</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Tables</h2>
		</div>
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<table class="min-w-full divide-y divide-border">
				<thead class="bg-secondary/50">
					<tr>
						<th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tenant</th>
						<th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unit</th>
						<th class="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rent</th>
						<th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each [
						{ name: 'A. Khan', unit: 'C-12', rent: 24500, status: 'Paid', tone: 'success' },
						{ name: 'R. Singh', unit: 'A-04', rent: 18000, status: 'Pending', tone: 'warning' },
						{ name: 'M. Devi', unit: 'B-09', rent: 21500, status: 'Overdue', tone: 'destructive' },
						{ name: 'S. Pillai', unit: 'D-02', rent: 27500, status: 'Paid', tone: 'success' },
						{ name: 'T. Joseph', unit: 'A-11', rent: 19500, status: 'Draft', tone: 'muted' }
					] as row}
						<tr class="transition hover:bg-secondary/40">
							<td class="px-5 py-3 text-sm font-medium">{row.name}</td>
							<td class="px-5 py-3 text-sm text-muted-foreground">{row.unit}</td>
							<td class="px-5 py-3 text-right font-mono text-sm">Rs. {row.rent.toLocaleString()}</td>
							<td class="px-5 py-3">
								{#if row.tone === 'success'}
									<span class="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">{row.status}</span>
								{:else if row.tone === 'warning'}
									<span class="inline-flex rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning">{row.status}</span>
								{:else if row.tone === 'destructive'}
									<span class="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">{row.status}</span>
								{:else}
									<span class="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{row.status}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Glow / gradient samples -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 08</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Glow & gradients</h2>
			<p class="text-sm text-muted-foreground">
				Three glow tiers, each a stack of inner + outer shadows. In light mode the glow is
				slate-950 tinted (drop-shadow feel); in dark it's the bright primary (emissive halo).
			</p>
		</div>
		<div class="grid gap-8 md:grid-cols-3">
			<div class="rounded-2xl border border-border bg-card p-6 text-center glow-primary">
				<p class="kicker mb-2">.glow-primary</p>
				<p class="font-mono text-2xl">soft halo</p>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6 text-center glow-primary-strong">
				<p class="kicker mb-2">.glow-primary-strong</p>
				<p class="font-mono text-2xl">strong halo</p>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6 text-center glow-primary-xl">
				<p class="kicker mb-2">.glow-primary-xl</p>
				<p class="font-mono text-2xl">XL halo</p>
			</div>
			<div
				class="md:col-span-3 rounded-2xl border border-border bg-gradient-to-br from-primary via-accent to-primary p-6 text-center text-primary-foreground"
			>
				<p class="kicker mb-2 text-primary-foreground/70">gradient surface</p>
				<p class="font-display text-2xl font-semibold">primary → accent → primary</p>
			</div>
		</div>
	</section>

	<!-- Motion -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 09</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Motion</h2>
			<p class="text-sm text-muted-foreground">
				Hover the panels below to feel the durations. Custom <code class="font-mono text-xs">ease-smooth</code> = <code class="font-mono text-xs">cubic-bezier(0.16, 1, 0.3, 1)</code> — lands without overshoot.
			</p>
		</div>
		<div class="grid gap-4 md:grid-cols-4">
			<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-150 ease-smooth hover:-translate-y-1 cursor-pointer">
				<p class="kicker mb-2">duration-150</p>
				<p class="font-mono text-lg">snap</p>
				<p class="mt-1 text-xs text-muted-foreground">interactive feedback (default)</p>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-200 ease-smooth hover:-translate-y-1 cursor-pointer">
				<p class="kicker mb-2">duration-200</p>
				<p class="font-mono text-lg">snappy</p>
				<p class="mt-1 text-xs text-muted-foreground">buttons, toggles</p>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-300 ease-smooth hover:-translate-y-1 cursor-pointer">
				<p class="kicker mb-2">duration-300</p>
				<p class="font-mono text-lg">balanced</p>
				<p class="mt-1 text-xs text-muted-foreground">menus, popovers</p>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6 glow-primary-strong transition-all duration-400 ease-smooth hover:-translate-y-1 cursor-pointer">
				<p class="kicker mb-2">duration-400</p>
				<p class="font-mono text-lg">deliberate</p>
				<p class="mt-1 text-xs text-muted-foreground">cards, surfaces</p>
			</div>
		</div>
		<div class="grid gap-4 md:grid-cols-3 mt-2">
			<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-300 cursor-pointer">
				<p class="kicker mb-2">no easing (linear-ish default)</p>
				<p class="text-sm text-muted-foreground">hover to compare</p>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-300 ease-out cursor-pointer">
				<p class="kicker mb-2">ease-out</p>
				<p class="text-sm text-muted-foreground">tailwind default</p>
			</div>
			<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-300 ease-smooth cursor-pointer">
				<p class="kicker mb-2">ease-smooth</p>
				<p class="text-sm text-muted-foreground">our custom curve</p>
			</div>
		</div>
	</section>

	<!-- Surface elevation -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 10</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Surface elevation</h2>
		</div>
		<div class="relative rounded-2xl border border-border bg-background p-8">
			<p class="kicker mb-2">background</p>
			<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
				<p class="kicker mb-2">card on background</p>
				<div class="rounded-xl border border-border bg-popover p-5 shadow-md">
					<p class="kicker mb-2">popover on card</p>
					<p class="text-sm text-muted-foreground">
						Each tier sits visually higher with a stronger shadow and slightly distinct
						background.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Pattern -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 11</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Pattern</h2>
			<p class="text-sm text-muted-foreground">
				Two pattern families. <code class="font-mono">bg-dots</code> for general canvas
				texture; <code class="font-mono">bg-ruby</code> for editorial letterhead-style
				gutters at ±65° crosshatch.
			</p>
		</div>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-2xl border border-border bg-background p-6 bg-dots">
				<p class="kicker mb-2">.bg-dots — 24px</p>
				<p class="font-mono text-sm">background</p>
			</div>
			<div class="rounded-2xl border border-border bg-background p-6 bg-dots-tight">
				<p class="kicker mb-2">.bg-dots-tight — 16px</p>
				<p class="font-mono text-sm">background</p>
			</div>
			<div class="rounded-2xl border border-border bg-background p-6 bg-ruby">
				<p class="kicker mb-2">.bg-ruby — 28px / ±65°</p>
				<p class="font-mono text-sm">background</p>
			</div>
			<div class="rounded-2xl border border-border bg-background p-6 bg-ruby-tight">
				<p class="kicker mb-2">.bg-ruby-tight — 18px / ±65°</p>
				<p class="font-mono text-sm">background</p>
			</div>
		</div>
	</section>

	<!-- Manager idioms -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 12</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Manager idioms</h2>
			<p class="text-sm text-muted-foreground">
				Components ported from the manager's ledger view, retokenized to live in the unified
				design language. They adapt automatically per mode — primary blue glow in light, accent
				cyan glow in dark.
			</p>
		</div>

		<!-- Unit token -->
		<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-400 ease-smooth">
			<p class="kicker mb-4">Unit token · pill chip representing a unit's occupancy state</p>
			<div class="flex flex-wrap items-center gap-3">
				<button class="unit-token unit-token-occupied">A1</button>
				<button class="unit-token unit-token-occupied">A2</button>
				<button class="unit-token unit-token-vacant">A3</button>
				<button class="unit-token unit-token-occupied">B1</button>
				<button class="unit-token unit-token-vacant">B2</button>
				<button class="unit-token unit-token-occupied">B3</button>
				<button class="unit-token unit-token-occupied">C1</button>
				<button class="unit-token unit-token-vacant">C2</button>
				<div class="mx-4 h-12 w-px bg-border"></div>
				<button class="unit-token unit-token-xl unit-token-occupied" aria-label="Occupied unit">
					<User class="h-7 w-7" />
				</button>
				<button class="unit-token unit-token-xl unit-token-vacant" aria-label="Vacant unit">
					<Plus class="h-7 w-7" />
				</button>
			</div>
			<p class="mt-4 text-xs text-muted-foreground">
				Hover to feel the lift + brightness shift. <code class="font-mono">.unit-token-xl</code>
				for the larger detail-view variant.
			</p>
		</div>

		<!-- Rent badge -->
		<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-400 ease-smooth">
			<p class="kicker mb-4">Rent badge · Monopoly title-deed style with corner brackets</p>
			<div class="flex flex-wrap items-center gap-6">
				<div class="rent-badge">
					<p class="rent-label">Monthly rent</p>
					<p class="rent-amount">Rs. 24,500</p>
				</div>
				<div class="rent-badge rent-badge-sm">
					<p class="rent-label">Deposit</p>
					<p class="rent-amount rent-amount-sm">Rs. 50,000</p>
				</div>
				<div class="rent-badge">
					<p class="rent-label">Outstanding</p>
					<p class="rent-amount">Rs. 12,400</p>
				</div>
			</div>
			<p class="mt-4 text-xs text-muted-foreground">
				Corner brackets via <code class="font-mono">::before</code> /
				<code class="font-mono">::after</code>. Mono numerals with text-shadow glow keyed to
				<code class="font-mono">--accent</code>.
			</p>
		</div>

		<!-- Property card with flip -->
		<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-400 ease-smooth">
			<p class="kicker mb-4">Property card · 3D flip on click, with aqua haze in bottom-right</p>
			<div class="flex flex-wrap items-start gap-6">
				<button class="property-card" onclick={() => (cardFlipped = !cardFlipped)} aria-label="Flip card">
					<div class="flip-inner" class:flipped={cardFlipped}>
						<!-- Front -->
						<div class="card-front card-face">
							<header class="flex items-start justify-between border-b border-dashed border-border/60 pb-3">
								<div>
									<p class="kicker">Block A</p>
									<h3 class="mt-0.5 font-display text-lg font-semibold">Sunshine Heights</h3>
									<p class="text-[11px] text-muted-foreground">12 units · Kochi · 2 vacant</p>
								</div>
								<div class="rounded-md border border-accent/15 bg-card/60 p-1 text-muted-foreground transition-all duration-200 ease-smooth hover:text-accent" aria-hidden="true">
									<RotateCw class="h-3.5 w-3.5" />
								</div>
							</header>
							<div class="flex-1 py-4">
								<p class="kicker mb-3">Units</p>
								<div class="grid grid-cols-4 gap-2">
									<div class="unit-token unit-token-occupied">1</div>
									<div class="unit-token unit-token-occupied">2</div>
									<div class="unit-token unit-token-vacant">3</div>
									<div class="unit-token unit-token-occupied">4</div>
									<div class="unit-token unit-token-occupied">5</div>
									<div class="unit-token unit-token-vacant">6</div>
									<div class="unit-token unit-token-occupied">7</div>
									<div class="unit-token unit-token-occupied">8</div>
								</div>
							</div>
							<footer class="mt-auto flex justify-center pt-2">
								<div class="rent-badge">
									<p class="rent-label">Rent / unit</p>
									<p class="rent-amount">Rs. 24,500</p>
								</div>
							</footer>
						</div>
						<!-- Back -->
						<div class="card-back card-face">
							<header class="border-b border-dashed border-border/60 pb-3">
								<p class="kicker">Block A · details</p>
								<h3 class="mt-0.5 font-display text-lg font-semibold">Sunshine Heights</h3>
							</header>
							<dl class="mt-4 space-y-3 text-sm">
								<div class="flex justify-between">
									<dt class="text-muted-foreground">Owner</dt>
									<dd>K. Rajan</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-muted-foreground">Bank profile</dt>
									<dd class="font-mono">SBI · 9032</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-muted-foreground">Total monthly</dt>
									<dd class="font-mono text-accent">Rs. 294,000</dd>
								</div>
								<div class="flex justify-between">
									<dt class="text-muted-foreground">Outstanding</dt>
									<dd class="font-mono text-destructive">Rs. 18,200</dd>
								</div>
							</dl>
						</div>
					</div>
				</button>
				<div class="flex-1 min-w-[200px] text-sm text-muted-foreground">
					<p>
						Click the card to flip. Front carries unit grid + rent badge; back carries
						owner / bank / billing details. The aqua haze in the bottom-right is rendered
						via <code class="font-mono">::before</code> radial gradient.
					</p>
					<p class="mt-3">
						State currently: <span class="font-mono text-foreground">{cardFlipped ? 'flipped' : 'front'}</span>
					</p>
				</div>
			</div>
		</div>

		<!-- Icon rail buttons -->
		<div class="rounded-2xl border border-border bg-card p-6 glow-primary transition-all duration-400 ease-smooth">
			<p class="kicker mb-4">Icon rail button · default / hover / active states</p>
			<div class="flex flex-wrap items-center gap-3">
				<button class="rail-btn" aria-label="Default">
					<BookUser class="h-5 w-5" />
				</button>
				<button class="rail-btn" aria-label="Wrench">
					<Wrench class="h-5 w-5" />
				</button>
				<button class="rail-btn" aria-label="Bell">
					<Bell class="h-5 w-5" />
				</button>
				<div class="mx-4 h-10 w-px bg-border"></div>
				<button
					class="rail-btn"
					class:rail-btn-active={railActive === 'contacts'}
					onclick={() => (railActive = 'contacts')}
					aria-label="Contacts"
					aria-pressed={railActive === 'contacts'}
				>
					<BookUser class="h-5 w-5" />
				</button>
				<button
					class="rail-btn"
					class:rail-btn-active={railActive === 'wrench'}
					onclick={() => (railActive = 'wrench')}
					aria-label="Wrench"
					aria-pressed={railActive === 'wrench'}
				>
					<Wrench class="h-5 w-5" />
				</button>
				<button
					class="rail-btn"
					class:rail-btn-active={railActive === 'bell'}
					onclick={() => (railActive = 'bell')}
					aria-label="Bell"
					aria-pressed={railActive === 'bell'}
				>
					<Bell class="h-5 w-5" />
				</button>
			</div>
			<p class="mt-4 text-xs text-muted-foreground">
				Click in the right group to swap the active state. The active state has accent
				background tint, accent border, and a soft accent halo via box-shadow.
			</p>
		</div>
	</section>

	<!-- App patterns -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 13</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">App patterns</h2>
			<p class="text-sm text-muted-foreground">
				High-frequency patterns lifted from the live routes — what list pages, detail pages,
				and dashboards repeatedly need. Adopt these directly during the route migration.
			</p>
		</div>

		<!-- Detail page header — back button + status badge -->
		<div class="rounded-2xl border border-border bg-card p-6">
			<p class="kicker mb-3">Detail page header — back button + kicker + title + status badge</p>
			<div class="rounded-2xl border border-border bg-gradient-to-br from-primary/8 via-card to-accent/8 p-5">
				<div class="flex items-start justify-between gap-4">
					<div class="flex items-start gap-3">
						<button
							class="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:text-foreground"
							aria-label="Back"
						>
							<ArrowLeft class="h-4 w-4" />
						</button>
						<div>
							<p class="kicker">Tenant</p>
							<h3 class="mt-0.5 font-display text-2xl font-semibold tracking-tight">A. Khan</h3>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Unit 12 · Block C · joined 2024-03-01
							</p>
						</div>
					</div>
					<span
						class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success"
					>
						<Check class="h-3 w-3" /> Active
					</span>
				</div>
			</div>
		</div>

		<!-- List chrome — search + filter pills -->
		<div class="rounded-2xl border border-border bg-card p-6">
			<p class="kicker mb-3">List chrome — search input + filter pill group</p>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div class="relative flex-1">
					<Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search tenants…"
						class="w-full rounded-2xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						class="rounded-2xl bg-gradient-to-r from-primary to-accent px-3.5 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
					>
						All
					</button>
					<button
						class="rounded-2xl border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
					>
						Active
					</button>
					<button
						class="rounded-2xl border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
					>
						Pending
					</button>
					<button
						class="rounded-2xl border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary"
					>
						Inactive
					</button>
				</div>
			</div>
		</div>

		<!-- Empty state -->
		<div class="rounded-2xl border border-border bg-card p-6">
			<p class="kicker mb-3">Empty state — no results / first-run / nothing-here</p>
			<div class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-background bg-dots py-12 text-center">
				<div class="rounded-2xl bg-secondary p-4 text-muted-foreground">
					<Inbox class="h-6 w-6" />
				</div>
				<p class="mt-4 font-display text-lg font-semibold">No tenants yet</p>
				<p class="mt-1 max-w-sm text-sm text-muted-foreground">
					Tenants will appear here when added. Get started by creating the first one.
				</p>
				<button
					class="mt-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
				>
					<Plus class="h-4 w-4" /> Add tenant
				</button>
			</div>
		</div>

		<!-- KPI stat tiles -->
		<div class="rounded-2xl border border-border bg-card p-6">
			<p class="kicker mb-3">KPI stat tiles — dashboard metrics with coloured icon boxes</p>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1">
					<div class="flex items-center gap-3">
						<div class="rounded-xl bg-primary p-2.5 text-primary-foreground">
							<Users class="h-5 w-5" />
						</div>
						<div>
							<p class="kicker">Tenants</p>
							<p class="font-mono text-2xl font-semibold tracking-tight">128</p>
						</div>
					</div>
				</div>
				<div class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1">
					<div class="flex items-center gap-3">
						<div class="rounded-xl bg-accent p-2.5 text-accent-foreground">
							<Building2 class="h-5 w-5" />
						</div>
						<div>
							<p class="kicker">Properties</p>
							<p class="font-mono text-2xl font-semibold tracking-tight">7</p>
						</div>
					</div>
				</div>
				<div class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1">
					<div class="flex items-center gap-3">
						<div class="rounded-xl bg-success p-2.5 text-success-foreground">
							<Receipt class="h-5 w-5" />
						</div>
						<div>
							<p class="kicker">Invoices</p>
							<p class="font-mono text-2xl font-semibold tracking-tight">342</p>
						</div>
					</div>
				</div>
				<div class="rounded-2xl border border-border bg-card p-5 glow-primary transition-all duration-400 ease-smooth hover:-translate-y-1">
					<div class="flex items-center gap-3">
						<div class="rounded-xl bg-destructive p-2.5 text-destructive-foreground">
							<AlertTriangle class="h-5 w-5" />
						</div>
						<div>
							<p class="kicker">Overdue</p>
							<p class="font-mono text-2xl font-semibold tracking-tight">3</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Definition list -->
		<div class="rounded-2xl border border-border bg-card p-6">
			<p class="kicker mb-3">Definition list — metadata grid for detail pages</p>
			<dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<User class="h-3 w-3" /> Owner
					</dt>
					<dd class="text-sm text-foreground">K. Rajan</dd>
				</div>
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Building2 class="h-3 w-3" /> Bank profile
					</dt>
					<dd class="font-mono text-sm text-foreground">SBI · 9032</dd>
				</div>
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Phone class="h-3 w-3" /> Phone
					</dt>
					<dd class="font-mono text-sm text-foreground">+94 77 555 0123</dd>
				</div>
				<div>
					<dt class="kicker mb-1 flex items-center gap-1.5">
						<Mail class="h-3 w-3" /> Email
					</dt>
					<dd class="text-sm text-foreground">a.khan@example.com</dd>
				</div>
				<div>
					<dt class="kicker mb-1">Joined</dt>
					<dd class="text-sm text-foreground">2024-03-01</dd>
				</div>
				<div>
					<dt class="kicker mb-1">Total billed (YTD)</dt>
					<dd class="font-mono text-sm text-accent">Rs. 294,000</dd>
				</div>
			</dl>
		</div>

		<!-- Relation section -->
		<div class="rounded-2xl border border-border bg-card p-6">
			<p class="kicker mb-3">Relation section — entity sublist on a detail page</p>
			<div class="rounded-2xl border border-border bg-card p-5">
				<header class="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
					<div class="flex items-center gap-2">
						<Receipt class="h-4 w-4 text-muted-foreground" />
						<h3 class="font-display text-base font-semibold">Recent invoices</h3>
						<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">3</span>
					</div>
					<button class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-all duration-200 ease-smooth hover:text-foreground">
						View all <ChevronRight class="h-3 w-3" />
					</button>
				</header>
				<ul class="mt-2 divide-y divide-border">
					<li class="flex items-center justify-between py-3">
						<div>
							<p class="font-mono text-sm">INV-1029</p>
							<p class="text-xs text-muted-foreground">Apr 30, 2026</p>
						</div>
						<div class="text-right">
							<p class="font-mono text-sm">Rs. 24,500</p>
							<span class="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Paid</span>
						</div>
					</li>
					<li class="flex items-center justify-between py-3">
						<div>
							<p class="font-mono text-sm">INV-1028</p>
							<p class="text-xs text-muted-foreground">Mar 30, 2026</p>
						</div>
						<div class="text-right">
							<p class="font-mono text-sm">Rs. 24,500</p>
							<span class="inline-flex rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning-foreground dark:bg-warning/15 dark:text-warning">Pending</span>
						</div>
					</li>
					<li class="flex items-center justify-between py-3">
						<div>
							<p class="font-mono text-sm">INV-1027</p>
							<p class="text-xs text-muted-foreground">Feb 28, 2026</p>
						</div>
						<div class="text-right">
							<p class="font-mono text-sm">Rs. 24,500</p>
							<span class="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">Paid</span>
						</div>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Page-hero example (real usage) -->
	<section class="space-y-4">
		<div>
			<p class="kicker">Section 14</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-tight">Page header (real usage)</h2>
			<p class="text-sm text-muted-foreground">
				The pattern lists/details pages should adopt: kicker → display title → subtitle → CTA.
			</p>
		</div>
		<div class="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 glow-primary-strong transition-all duration-400 ease-smooth hover:-translate-y-1">
			<div class="flex flex-wrap items-end justify-between gap-6">
				<div>
					<p class="kicker">Tenants</p>
					<h1 class="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
						All tenants
					</h1>
					<p class="mt-1 max-w-2xl text-sm text-muted-foreground">
						128 active tenants across 7 properties. Use filters to narrow down.
					</p>
				</div>
				<div class="flex gap-3">
					<button class="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:bg-secondary">
						<Building2 class="h-4 w-4" />
						By property
					</button>
					<button class="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary">
						<Plus class="h-4 w-4" />
						New tenant
					</button>
				</div>
			</div>
		</div>
	</section>
</div>
