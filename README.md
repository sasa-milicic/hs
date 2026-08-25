# HybridSign

A React 19 port of the legacy Angular HybridSign PDF-signing library
(`@hs/lib`), plus two demo apps showing how to consume it.

```
lib/                  @hs/lib — the React component library
apps/react-demo/      Demo app consuming it directly (React)
apps/angular-demo/    Demo app consuming it via a manual React-in-Angular bridge
```

## Requirements

- **Node ≥ 22.13** (or Node 24). `pdfjs-dist` declares this as its minimum;
  `npm install` will print an `EBADENGINE` warning on older Node but has
  worked in practice on Node 20.19 too — 22+ is the supported baseline,
  don't rely on that.
- npm (this is an npm workspaces monorepo — `lib` and everything under
  `apps/*` are npm workspaces, not separate repos).

## Setup

```bash
npm install
```

That's the one command. `lib` doesn't need a separate manual build step —
the root `postinstall` script runs `npm run build:lib`
automatically right after `npm install` finishes, so `lib/dist/` exists by
the time you try to run either demo app.

## Running a demo app

From the repo root:

```bash
npm run dev:react     # http://localhost:5173
npm run dev:angular   # http://localhost:4200
```

Each also has `:edeja`, `:services`, and `:production` variants
(`npm run dev:react:services`, `npm run dev:angular:services`, etc.), each
pointing at a different backend environment — see each app's own
`vite.config.ts`/`angular.json` for what each one targets.

Both point at the real backend (`services.post-business-solutions.at`) by
default — you need a real document/session to actually sign something, but
the UI itself (tenant theming, layout, dialogs) is inspectable without one.

`apps/angular-demo/README.md` documents the React-in-Angular integration
itself in detail (the host-component bridge, the `Promise.try` polyfill
zone.js needs, the `pdf.worker`/`jbig2.wasm` asset wiring) — read that if
you're embedding `@hs/lib` in your own Angular app rather than just
running this demo.

## Does `lib` need to be rebuilt while I work on it?

- **`apps/react-demo`'s dev server (`npm run dev:react`)** aliases `@hs/lib`
  straight to `lib/src` in dev mode, so editing `lib/src/**/*.tsx?` shows up
  on save with no rebuild. The one exception: `lib/src/**/*.module.css`
  changes need `npm run build:lib` re-run to show up, since the
  bundled `lib/dist/pdf-viewer.css` is what's actually imported.
- **`apps/angular-demo` and any production build (`npm run build` here or
  in either app)** resolve `@hs/lib` as a real package pointing at
  `lib/dist/`, with no source-aliasing shortcut — always run
  `npm run build:lib` after a `lib/src` change before those
  will see it.

## Building everything for production

```bash
npm run build
```

Builds `lib`, then `apps/react-demo`, then `apps/angular-demo`, in that
order, each into its own `dist/`.

## Other root scripts

```bash
npm run lint     # eslint across the whole workspace
npm run format   # prettier --write .
```
