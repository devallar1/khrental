<script>
	import '../app.css';
	import { Toaster } from 'svelte-french-toast';

	let { children, data } = $props();
</script>

<Toaster position="top-right" />
{@render children()}
