import { paraglide } from '@inlang/paraglide-sveltekit/vite'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		paraglide({ 
			project: './project.inlang', 
			outdir: './src/lib/paraglide' 
		}),
		sveltekit()
	],
	server: {
		host: '0.0.0.0',
		port: 5173
	},
	resolve: {
    alias: {
      '@': '/src',
			'klinecharts': 'klinecharts/dist/index.esm.js'
		}
	}
});