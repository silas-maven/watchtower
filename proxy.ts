import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function isLoginRoute(pathname: string): boolean {
  return pathname === '/login';
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isLoginRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('wt_session')?.value;
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)'],
};

