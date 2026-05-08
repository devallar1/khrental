<script>
	import { ArrowLeft } from 'lucide-svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Add Team Member - KH Rentals</title>
</svelte:head>

<div>
	<div class="mb-8">
		<a href="/configure/team" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-4">
			<ArrowLeft class="h-4 w-4" />
			Back to Team
		</a>
		<h1 class="text-2xl font-bold text-foreground sm:text-3xl">Add Team Member</h1>
		<p class="mt-1 text-sm text-muted-foreground">Add a new admin, manager, or staff member</p>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<div class="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
		<form method="POST" class="space-y-5">
			<div>
				<label for="name" class="block text-sm font-medium text-foreground mb-1.5">Name</label>
				<input
					type="text"
					id="name"
					name="name"
					value={form?.name || ''}
					required
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Full name"
				/>
			</div>

			<div>
				<label for="email" class="block text-sm font-medium text-foreground mb-1.5">Email</label>
				<input
					type="email"
					id="email"
					name="email"
					value={form?.email || ''}
					required
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="email@example.com"
				/>
			</div>

			<div>
				<label for="role" class="block text-sm font-medium text-foreground mb-1.5">Role</label>
				<select
					id="role"
					name="role"
					required
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">Select a role</option>
					<option value="admin" selected={form?.role === 'admin'}>Admin</option>
					<option value="manager" selected={form?.role === 'manager'}>Manager</option>
					<option value="staff" selected={form?.role === 'staff'}>Staff</option>
				</select>
			</div>

			<div>
				<label for="notes" class="block text-sm font-medium text-foreground mb-1.5">Notes</label>
				<textarea
					id="notes"
					name="notes"
					rows="3"
					class="w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 ease-smooth focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Optional notes about this team member"
				>{form?.notes || ''}</textarea>
			</div>

			<div class="flex items-center gap-3 pt-2">
				<button
					type="submit"
					class="rounded-2xl bg-gradient-to-r from-primary to-accent px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:glow-primary"
				>
					Add Member
				</button>
				<a href="/configure/team" class="rounded-2xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition">
					Cancel
				</a>
			</div>
		</form>
	</div>
</div>
