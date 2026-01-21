# Astro + Observable Notebook-Kit Blog

An Astro-based blog that integrates [Observable notebook-kit](https://github.com/observablehq/notebook-kit) to embed interactive Observable notebooks directly into MDX pages.

## Overview

This project combines Astro's static site generation with Observable's notebook-kit to create a blog where you can write posts in MDX and embed interactive, reactive notebooks. Observable notebooks are converted into reusable JavaScript libraries that can be imported and rendered in any Astro/MDX page.

## Project Structure

```
/
├── packages/
│   ├── notebook-builder/          # Notebook-to-library converter tool
│   │   ├── bin/convert.ts         # CLI for converting .html notebooks
│   │   └── src/                   # Parser, transpiler, and generator
│   ├── notebooks/                 # Your Observable notebooks
│   │   └── diff-demo/            # Example: diff visualization notebook
│   │       ├── notebook.html     # Source notebook from Observable
│   │       ├── package.json      # Generated npm package config
│   │       ├── dist/             # Generated library output
│   │       │   ├── define.js     # Cell definitions
│   │       │   ├── runtime.js    # Observable runtime
│   │       │   └── index.js      # Package entry point
│   │       └── src/              # Transpiled cell sources
│   └── top-level-package-test/   # Example workspace package
├── src/
│   ├── components/
│   │   ├── Notebook.tsx          # React component to mount notebooks
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BaseLayout.astro      # Base page layout
│   └── pages/
│       ├── index.astro           # Homepage
│       └── hello-world.mdx       # Example MDX blog post
├── public/                        # Static assets
├── astro.config.mjs              # Astro configuration (React + MDX)
├── pnpm-workspace.yaml           # PNPM monorepo workspace config
└── package.json                  # Root package scripts
```

## How It Works

### 1. Notebook Conversion Pipeline

Observable notebooks are authored as HTML files and the build process converts them into  standard JavaScript libraries using the custom `notebook-builder` tool:

1. Write a notebook in Observable 20. `notebook-kit` format
2. Place it in `packages/notebooks/<notebook-name>/notebook.html`
3. Run the build script to convert it to a JavaScript library
4. The converter generates:
   - `dist/define.js` - Cell definitions and dependencies
   - `dist/runtime.js` - Observable runtime setup
   - `dist/index.js` - Package entry point with `mount()` function
   - `package.json` - NPM package with dependencies

The converter:
- Parses the notebook HTML to extract cells
- Transpiles cell code and analyzes dependencies
- Detects workspace packages and creates `workspace:*` links
- Preserves existing `package.json` customizations
- Generates a `mount()` function for easy embedding

### 2. Astro Integration

The Astro site is configured with React and MDX integrations ([astro.config.mjs](astro.config.mjs)):

- React provides the `<Notebook>` component for client-side rendering
- MDX allows embedding React components in markdown blog posts
- The `<Notebook>` component dynamically imports and mounts notebook modules

### 3. Embedding Notebooks in MDX

To use a notebook in a blog post:

```mdx
---
layout: ../layouts/BaseLayout.astro
title: My Post
---

# My Post with Interactive Notebook

<Notebook client:load moduleName="hello-world-diff-demo" />
```

The `<Notebook>` component ([src/components/Notebook.tsx](src/components/Notebook.tsx#L1)):
- Dynamically imports the notebook module
- Calls the `mount()` function to render cells
- Handles cleanup when the component unmounts

## Build Process

### Development Modes

#### Standard Development
```bash
pnpm dev
```
- Runs `pnpm build:notebooks` once before starting
- Starts Astro dev server on `localhost:4321`
- Hot-reloads Astro/MDX changes
- Notebooks are NOT rebuilt automatically

#### Live Development
```bash
pnpm dev:live
```
- Runs two concurrent processes:
  1. `pnpm watch:notebooks` - Watches all notebooks and rebuilds on changes
  2. `astro dev` - Runs Astro dev server
- Best for actively developing notebooks
- Changes to `notebook.html` files trigger automatic rebuilds

### Production Build
```bash
pnpm build
```
- Runs `pnpm build:notebooks` first
- Builds static site to `./dist/`
- All notebook libraries are bundled

### Notebook Build Scripts

#### Build all notebooks
```bash
pnpm build:notebooks
```
Runs the build script in every package under `packages/notebooks/*`:
- Converts `notebook.html` to JavaScript library
- Updates `package.json` with dependencies
- Generates TypeScript-compatible output

#### Watch notebooks
```bash
pnpm watch:notebooks
```
Runs the dev/watch script in every notebook package:
- Monitors `notebook.html` for changes
- Automatically rebuilds on save
- Used by `dev:live` for hot-reloading

## Creating a New Notebook

1. Create a notebook on [observablehq.com](https://observablehq.com)
2. Export it as HTML (File → Export → HTML)
3. Create a new directory in `packages/notebooks/`:
   ```bash
   mkdir -p packages/notebooks/my-notebook
   ```
4. Add the exported HTML:
   ```bash
   mv ~/Downloads/notebook.html packages/notebooks/my-notebook/
   ```
5. Create `packages/notebooks/my-notebook/package.json`:
   ```json
   {
     "name": "my-notebook",
     "version": "0.1.0",
     "type": "module",
     "main": "dist/index.js",
     "exports": {
       ".": "./dist/index.js"
     },
     "scripts": {
       "build": "tsx ../../notebook-builder/bin/convert.ts ./notebook.html --out .",
       "dev": "tsx ../../notebook-builder/bin/convert.ts ./notebook.html --out . --watch"
     },
     "dependencies": {
       "@observablehq/runtime": "^5.0.0",
       "@observablehq/inspector": "latest",
       "@observablehq/stdlib": "latest"
     }
   }
   ```
6. Build it:
   ```bash
   pnpm build:notebooks
   ```
7. Add it to your root `package.json` dependencies:
   ```json
   {
     "dependencies": {
       "my-notebook": "workspace:*"
     }
   }
   ```
8. Install dependencies:
   ```bash
   pnpm install
   ```
9. Use it in any MDX page:
   ```mdx
   <Notebook client:load moduleName="my-notebook" />
   ```

## Workspace Packages

The project uses PNPM workspaces to manage multiple packages. Notebooks can import from other workspace packages using bare imports:

```javascript
import { myFunction } from "top-level-package-test";
```

The notebook converter automatically detects workspace packages and uses `workspace:*` protocol for local linking, enabling development without publishing to npm.

## Commands Reference

| Command | Action |
|:--------|:-------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start dev server (notebooks built once) |
| `pnpm dev:live` | Start dev server with live notebook rebuilding |
| `pnpm build` | Build production site |
| `pnpm preview` | Preview production build |
| `pnpm build:notebooks` | Build all notebooks once |
| `pnpm watch:notebooks` | Watch and rebuild notebooks on changes |

## Technology Stack

- [Astro](https://astro.build) - Static site generator with islands architecture
- [React](https://react.dev) - For interactive components
- [MDX](https://mdxjs.com) - Markdown with JSX support
- [Observable notebook-kit](https://github.com/observablehq/notebook-kit) - Runtime for Observable notebooks
- [PNPM](https://pnpm.io) - Fast, efficient package manager with workspace support
- [TypeScript](https://www.typescriptlang.org) - Type-safe JavaScript

## Learn More

- [Astro Documentation](https://docs.astro.build)
- [Observable notebook-kit](https://github.com/observablehq/notebook-kit)
- [PNPM Workspaces](https://pnpm.io/workspaces)
- [MDX](https://mdxjs.com)
