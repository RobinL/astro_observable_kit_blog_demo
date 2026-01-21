// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.robinlinacre.com',
  base: '/astro_observable_kit_blog_demo',
  integrations: [react(), mdx()],
  vite: {
    ssr: {
      // Force bundling workspace packages instead of treating as external
      noExternal: ['hello-world-diff-demo', 'match-weight-calculator']
    },
    optimizeDeps: {
      // Exclude workspace packages from pre-bundling so changes are picked up
      exclude: ['hello-world-diff-demo', 'match-weight-calculator']
    }
  }
});