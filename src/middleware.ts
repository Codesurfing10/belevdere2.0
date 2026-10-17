import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, cookieOptions, newSessionId, rateLimit, sign, verify } from '@/lib/security';

const MUTATING_PREFIXES = ['/api/cart', '/api/bookings', '/api/checkout', '/api/agent'];

function clientIp(req: NextRequest): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

function adminAuthorized(req: NextRequest): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false; // admin disabled unless a password is configured
  const h = req.headers.get('authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  try {
    const [, pass] = atob(h.slice(6)).split(':');
    return pass === pw;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!adminAuthorized(req)) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="belevdere-admin"' },
      });
    }
    return NextResponse.next();
  }

  const session = await verify(req.cookies.get(SESSION_COOKIE)?.value);
  const isMutatingApi =
    req.method !== 'GET' && MUTATING_PREFIXES.some((p) => pathname.startsWith(p));

  if (pathname.startsWith('/api/')) {
    const limit = isMutatingApi ? 20 : 120;
    if (!rateLimit(`${clientIp(req)}:${isMutatingApi ? 'w' : 'r'}`, limit)) {
      return NextResponse.json({ error: 'Too many requests, slow down.' }, { status: 429 });
    }
  }

  if (isMutatingApi && !session) {
    return NextResponse.json(
      { error: 'Session required. Reload the page and try again.', code: 'NO_SESSION' },
      { status: 401 }
    );
  }

  const res = NextResponse.next();
  if (!session) {
    res.cookies.set(SESSION_COOKIE, await sign(newSessionId()), {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return res;
}

export const config = {
  // webhooks authenticate via provider signatures; skip static assets
  matcher: ['/((?!_next/|favicon|api/webhooks/).*)'],
};
