// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), mdx()],
  vite: {
    ssr: {
      // Force bundling workspace packages instead of treating as external
      noExternal: ['hello-world-diff-demo']
    },
    optimizeDeps: {
      // Pre-bundle for faster dev server startup
      include: ['hello-world-diff-demo']
    }
  }
});