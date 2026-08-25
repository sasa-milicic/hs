# Integrating `@hs/lib` (React) into Angular

`@hs/lib` is a React 19 component library — it has no Angular wrapper
or web-component build. This app is a real, working reference for mounting
it inside an Angular application by hand. The short version: create a plain
`<div>` host element, mount a React root into it with `createRoot`, and keep
that root's `render()` call in sync with your Angular component's inputs.

## 1. Install

```bash
npm install @hs/lib react@^19 react-dom@^19
```

React and Angular can coexist in the same page — they don't conflict, since
React only ever touches the DOM subtree inside the host `<div>` you hand it.

## 2. The `Promise.try` polyfill (required, order matters)

Angular's `zone.js` replaces the global `Promise` with `ZoneAwarePromise`,
which doesn't implement `Promise.try` — a method `pdfjs-dist` (this
library's PDF rendering engine) calls on every worker RPC message. Without
it, PDF loading hangs forever with no visible error, since the handler
throws synchronously on the first message from the worker.

Add [`src/promise-try-polyfill.ts`](./src/promise-try-polyfill.ts) to your
own app and import it as the **very first line** of `main.ts`, before
`zone.js`'s polyfills or anything that might import `pdfjs-dist`:

```ts
import './promise-try-polyfill';
import { bootstrapApplication } from '@angular/platform-browser';
// ...
```

## 3. The PDF worker and JBIG2 wasm assets

`@hs/lib` imports two `pdfjs-dist` files with Vite's `?url` suffix
(`pdf.worker.min.mjs`, and `jbig2.wasm` — needed to decode JBIG2-compressed
scanned-document PDF pages). Both are left external in the library's own
build, so your bundler resolves them — but Angular's esbuild-based builder
doesn't understand the `?url` suffix convention and fails with `No loader is
configured for ".wasm"/".mjs" files` unless you redirect it.

**a) Stub the imports** via `tsconfig.json` path mapping — see
[`src/pdf-worker-url-stub.ts`](./src/pdf-worker-url-stub.ts) and
[`src/jbig2-wasm-url-stub.ts`](./src/jbig2-wasm-url-stub.ts) (each just
exports a plain string path):

```json
{
  "compilerOptions": {
    "paths": {
      "pdfjs-dist/build/pdf.worker.min.mjs?url": [
        "./src/pdf-worker-url-stub.ts"
      ],
      "pdfjs-dist/wasm/jbig2.wasm?url": ["./src/jbig2-wasm-url-stub.ts"]
    }
  }
}
```

**b) Copy the real files as static assets** at the paths those stubs point
to — see `angular.json`'s `architect.build.options.assets`:

```json
{
  "glob": "pdf.worker.min.mjs",
  "input": "node_modules/pdfjs-dist/build",
  "output": "pdf-worker"
},
{
  "glob": "jbig2.wasm",
  "input": "node_modules/pdfjs-dist/wasm",
  "output": "pdf-worker"
}
```

## 4. The CSS

`@hs/lib` ships its own stylesheet at `@hs/lib/style.css`.
Add it to `angular.json`'s global `styles` array, alongside your own:

```json
"styles": ["src/styles.css", "node_modules/@hs/lib/dist/pdf-viewer.css"]
```

## 5. The host component

This is the actual bridge. See
[`src/app/hybrid-sign-host.component.ts`](./src/app/hybrid-sign-host.component.ts)
for the full, real version (it also handles the three endscreen components);
the shape in brief:

```ts
@Component({
  selector: 'app-hybrid-sign-host',
  template: '<div #container></div>',
})
export class HybridSignHostComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  private readonly ngZone = inject(NgZone);
  @ViewChild('container', { static: true })
  private containerRef!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) transactionId!: string;
  @Output() readonly sessionEnd = new EventEmitter<SessionEndEvent>();

  private root: Root | null = null;

  ngAfterViewInit(): void {
    this.root = createRoot(this.containerRef.nativeElement);
    this.renderReactTree();
  }

  ngOnChanges(): void {
    this.renderReactTree();
  }

  ngOnDestroy(): void {
    this.root?.unmount();
    this.root = null;
  }

  private renderReactTree(): void {
    this.root?.render(
      createElement(HybridSign, {
        transactionId: this.transactionId,
        onSessionEnd: (event) =>
          this.ngZone.run(() => this.sessionEnd.emit(event)),
      }),
    );
  }
}
```

Why each part is there:

- **`createRoot` in `ngAfterViewInit`, not the constructor** — the
  `#container` div doesn't exist in the DOM until Angular has rendered the
  template.
- **`render()` called again in `ngOnChanges`** — Angular's change detection
  doesn't know React exists. Every time an `@Input()` changes, you have to
  explicitly re-render the React tree yourself; React's own reconciliation
  then does the efficient DOM diffing from there.
- **`root.unmount()` in `ngOnDestroy`** — React doesn't know when Angular
  removes the host component either. Skipping this leaks the whole React
  tree (event listeners, any pending timers/subscriptions inside it).
- **`ngZone.run(...)` around the callback** — event handlers React attaches
  run _outside_ Angular's zone (Angular only patches DOM APIs it knows
  about at bootstrap, before React ever touches anything). Without
  `ngZone.run`, calling `this.sessionEnd.emit(event)` would update
  Angular-bound state but never trigger change detection, so the template
  wouldn't visibly update until something unrelated happened to trigger a
  tick.

## 6. Using it

```html
<app-hybrid-sign-host
  [transactionId]="transactionId"
  [tenantId]="tenantId"
  (sessionEnd)="onSessionEnd($event)"
/>
```

See [`src/app/app.component.html`](./src/app/app.component.html) for the
full working example, including the upload flow that creates a session and
the tenant/language switcher.

## Known warnings (harmless)

The build prints `Module 'react' ... is not ESM` / `CommonJS or AMD
dependencies can cause optimization bailouts` for `react`, `react-dom`, and
`use-sync-external-store` — Angular's bundler flagging these packages'
CJS interop shims. This only disables a minor optimization for those
specific modules; it doesn't affect correctness and isn't something this
project's Vite-based library build controls.

## Local monorepo development only

This app resolves `@hs/lib` as a workspace package pointing straight
at `lib/`'s _source_ (not a published `dist/`), so `angular.json`'s
`serve.options.prebundle.exclude: ["@hs/lib"]` keeps the dev-server
from pre-bundling a stale copy across `lib/src` edits. A real consumer
installing the published package from npm doesn't need this — it only
matters inside this repo.
