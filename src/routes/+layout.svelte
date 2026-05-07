<script>
	import '../App.css';
	import '@fontsource/inter-tight/400.css';
	import '@fontsource/inter-tight/500.css';
	import '@fontsource/inter-tight/600.css';
	import '@fontsource/inter-tight/700.css';
	import '@fontsource/jetbrains-mono/400.css';
	import '@fontsource/jetbrains-mono/500.css';
	import '@fontsource/jetbrains-mono/600.css';
	import '@fontsource/jetbrains-mono/700.css';
	// Editorial theme fonts
	import '@fontsource/bodoni-moda/400.css';
	import '@fontsource/bodoni-moda/600.css';
	import '@fontsource/bodoni-moda/700.css';
	import '@fontsource/bodoni-moda/400-italic.css';
	import '@fontsource/libre-baskerville/400.css';
	import '@fontsource/libre-baskerville/700.css';
	import '@fontsource/libre-baskerville/400-italic.css';
	import '@fontsource/pirata-one/400.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-french-toast';

	let { children, data } = $props();
</script>

<ModeWatcher defaultMode="system" />
<Toaster position="top-right" />
{@render children()}
