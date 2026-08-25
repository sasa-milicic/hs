import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Dev-serve only: point the `@hs/lib` import straight at the
  // library's TS source instead of its built `dist/` bundle, so editing
  // `lib/src` shows up here on save with no `npm run build --workspace=lib`
  // step in between. Each component's own `*.module.css` import already
  // gets Vite's normal dev-mode style injection once resolution goes
  // through source, so the separate bulk `@hs/lib/style.css` import
  // in `main.tsx` is redundant here — aliased to the (stale but harmless,
  // since dev-mode CSS-module class names differ per build) already-built
  // file rather than left to resolve on its own, since Vite alias keys are
  // prefix matches: without its own entry here, this subpath would also
  // hit the bare `@hs/lib` alias below and fail to resolve. Array
  // order matters — this more specific entry must come first. `vite build`
  // (and any other non-serve command) is untouched — production/CI builds
  // still go through the real published package, exactly like before.
  resolve:
    command === 'serve'
      ? {
          alias: [
            {
              find: '@hs/lib/style.css',
              replacement: fileURLToPath(
                new URL('../../lib/dist/pdf-viewer.css', import.meta.url),
              ),
            },
            {
              find: '@hs/lib',
              replacement: fileURLToPath(
                new URL('../../lib/src/index.ts', import.meta.url),
              ),
            },
          ],
        }
      : undefined,
  server: {
    proxy: {
      '/hybridsign': {
        target: 'https://services.post-business-solutions.at',
        changeOrigin: true,
      },
    },
  },
}));
