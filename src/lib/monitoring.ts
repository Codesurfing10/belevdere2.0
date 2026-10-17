/**
 * Optional error reporting. If SENTRY_DSN is set, errors are POSTed to Sentry's
 * store endpoint (no SDK dependency). Otherwise they are only logged.
 */
export async function captureError(err: unknown, context: Record<string, unknown> = {}) {
  console.error('[belevdere]', err, context);
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, '');
    const endpoint = `${u.protocol}//${u.host}/api/${projectId}/store/`;
    const e = err instanceof Error ? err : new Error(String(err));
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${u.username}, sentry_client=belevdere/0.1`,
      },
      body: JSON.stringify({
        message: e.message,
        level: 'error',
        platform: 'javascript',
        environment: process.env.NODE_ENV,
        extra: { ...context, stack: e.stack },
      }),
    });
  } catch {
    // never let monitoring break the request
  }
}
