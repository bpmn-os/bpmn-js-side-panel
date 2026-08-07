import { defineConfig } from 'vite';

// Builds the demo, which is the package shown working rather than described: a modeller with the side
// panel hosting the properties panel and a tab of its own. `root: 'demo'` serves it, and `fs.allow` lets
// it read the sibling `src/` and `assets/`, which is the point — the demo runs the source, not a copy.
// `base` is the sub-path the demo is published under, https://bpmn-os.github.io/<repo>/, which it takes
// only in the workflow that publishes it; served locally it is at the root.
export default defineConfig({
  root: 'demo',
  base: process.env.GITHUB_ACTIONS ? '/bpmn-js-side-panel/' : '/',
  // `es2022` because the demo imports the diagram and awaits it where it stands, which is a top-level
  // await, and the default target predates it.
  build: { target: 'es2022', outDir: '../dist', emptyOutDir: true },
  server: { fs: { allow: [ '..' ] } }
});
