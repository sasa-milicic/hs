// Angular's zone.js replaces the global `Promise` with `ZoneAwarePromise`,
// which implements `resolve`/`reject`/`race`/`all` but not the newer
// `Promise.try` — used internally by pdfjs-dist's worker message handler on
// every RPC call. Without it, that handler throws synchronously on the first
// message from the worker and the PDF load hangs forever with no visible
// error. Restore it here, before anything imports pdfjs-dist.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- global interface merge, not a value
interface PromiseConstructor {
  try<T>(
    fn: (...args: unknown[]) => T | PromiseLike<T>,
    ...args: unknown[]
  ): Promise<T>;
}

if (typeof Promise.try !== 'function') {
  Promise.try = function <T>(
    fn: (...args: unknown[]) => T | PromiseLike<T>,
    ...args: unknown[]
  ): Promise<T> {
    return new Promise<T>((resolve) => resolve(fn(...args)));
  };
}
