import { defineMarkdocConfig, component } from "@astrojs/markdoc/config"
import starlightMarkdoc from "@astrojs/starlight-markdoc"

// https://docs.astro.build/en/guides/integrations-guide/markdoc/
export default defineMarkdocConfig({
  extends: [starlightMarkdoc()],
  tags: {
    FrontPage: {
      render: component("./src/components/FrontPage.astro"),
    },
		steps: {
			render: component('@astrojs/starlight/components', 'Steps'),
			attributes: {},
		}, 
  }
})
