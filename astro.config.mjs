// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import markdoc from '@astrojs/markdoc';
import { readdir } from "fs/promises";

async function autogenSections() {
	const sections = (
		await readdir("./src/content/docs/", {
			withFileTypes: true,
		})
	)
		.filter((x) => x.isDirectory())
		.map((x) => x.name);
	return sections.map((x) => {
		return {
			label: x,
			autogenerate: {
				directory: x,
				collapsed: true,
			},
		};
	});
}

// https://astro.build/config
export default defineConfig({
	prefetch: {
		defaultStrategy: 'viewport',
		prefetchAll: true,
	},
	integrations: [
		markdoc({ allowHTML: true }),
		starlight({
			title: 'FusionCare Documentation',
			customCss: ['./src/styles/custom.css',],
			logo: {
				light: './src/assets/light-logo.svg',
				dark: './src/assets/dark-logo.svg',
				replacesTitle: true,
			},
			sidebar: await autogenSections(),
			components: {
				Sidebar: './src/components/Sidebar.astro'
			},
			pagination: false,
		}),
	],
});
