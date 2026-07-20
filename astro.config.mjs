// @ts-check
import { defineConfig } from "astro/config";

import node from "@astrojs/node";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: "standalone",
  }),
  server: {
    allowedHosts: ["localhost:8080"],
  },
  security: {
    checkOrigin: true,
  },
  integrations: [react()],
});
