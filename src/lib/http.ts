import { NextResponse } from 'next/server';
import { captureError } from '@/lib/monitoring';

export const GENERIC_ERROR = 'Something went wrong. No charge was made by this request; please try again.';

/** Log the real error server-side and return a generic message to the client. */
export async function serverError(route: string, err: unknown, context: Record<string, unknown> = {}, status = 500) {
  await captureError(err, { route, ...context });
  return NextResponse.json({ error: GENERIC_ERROR, success: false }, { status });
}
