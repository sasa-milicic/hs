import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      exclude: ['vite.config.ts'],
    }),
  ],
  build: {
    // The two endscreen logo PNGs are ~14-54KB each — inlined as base64
    // (Vite's default for library builds with no size threshold applied)
    // that would add ~90KB to every consumer's bundle just for two images
    // only shown on a rare "session ended" screen. Emit them as real files
    // instead.
    assetsInlineLimit: 0,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'HsPdfViewer',
      fileName: 'pdf-viewer',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'pdfjs-dist',
        /^pdfjs-dist\/build\/pdf\.worker/,
        // jbig2.wasm (~102KB) — needed to derive the `wasmUrl` pdf.js needs
        // to decode JBIG2/OpenJPEG-compressed images (scanned-document PDF
        // pages). Same Rolldown-Vite library-mode limitation already noted
        // for the endscreen PNGs above: without this, the `?url` import
        // gets base64-inlined into the bundle (~140KB after inflation)
        // instead of emitted as a real asset — external defers resolution
        // to the consumer's own bundler, same as the worker script above.
        /^pdfjs-dist\/wasm\//,
        'i18next',
        'react-i18next',
      ],
    },
  },
});
