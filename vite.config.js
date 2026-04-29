import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5175,
		host: true,
		allowedHosts: [
			'nucbox',
			'localhost',
			'127.0.0.1',
			'.local',
			'x99',          // x99 condor — LAN mirror via Tailscale (see docker/mirror/)
			'condor'        // alias if MagicDNS uses the model name
		]
	},
});
