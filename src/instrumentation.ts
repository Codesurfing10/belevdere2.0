export async function register() {}

// Next.js 15 hook: reports unhandled server errors (only sends if SENTRY_DSN is set).
export async function onRequestError(err: unknown, request: { path?: string; method?: string }) {
  const { captureError } = await import('./lib/monitoring');
  await captureError(err, { path: request?.path, method: request?.method });
}
