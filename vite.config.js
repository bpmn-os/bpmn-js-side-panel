import { defineConfig } from 'vite';

// Builds the demo, which is the package shown working rather than described: a modeller with the side
// panel hosting the properties panel and a tab of its own. `root: 'demo'` serves it, and `fs.allow` lets
// it read the sibling `src/` and `assets/`, which is the point — the demo runs the source, not a copy.
export default defineConfig({
  root: 'demo',
  build: { outDir: '../dist', emptyOutDir: true },
  server: { fs: { allow: [ '..' ] } }
});
