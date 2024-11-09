// @ts-check
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import markdoc from "@astrojs/markdoc"
import { readdir } from "fs/promises"

// https://astro.build/config
export default defineConfig({
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
  integrations: [
    markdoc({ allowHTML: true }),
    starlight({
      title: "FusionCare Documentation",
      customCss: ["./src/styles/custom.css"],
      logo: {
        light: "./src/assets/light-logo.svg",
        dark: "./src/assets/dark-logo.svg",
        replacesTitle: true,
      },
      sidebar: [],
      components: {
        EditLink: "./src/components/overrides/EditLink.astro",
      },
      pagination: false,
      editLink: { baseUrl: "https://docs.forfusion.uk/ed#/collections/docs/entries/", },
    }),
  ],
})
