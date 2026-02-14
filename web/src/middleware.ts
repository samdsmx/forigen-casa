import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from 'app/types/supabase';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Ensure auth cookies are set for the entire site and survive redirects.
          res.cookies.set({
            name,
            value,
            ...options,
            path: '/',
            sameSite: 'lax',
            secure: true,
          });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', path: '/', maxAge: 0, ...options });
        },
      },
    }
  );

  const pathname = req.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/login');

  // Always allow access to login page to avoid redirect loops
  if (isAuthPage) {
    return res;
  }

  try {
    // Add timeout to prevent middleware from hanging
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 5000)
    );

    const { data: { session } } = await Promise.race([
      sessionPromise, 
      timeoutPromise
    ]) as any;

    const user = session?.user;

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirectedFrom', pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  } catch (error) {
    // On timeout or error, redirect to login for safety
    console.error('[Middleware] Session check failed:', error);
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectedFrom', pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Help avoid browsers serving stale HTML after deploys
  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    res.headers.set('Cache-Control', 'no-store');
  }
  return res;
}

// Exclude static assets and API routes from middleware
export const config = {
  matcher: [
    // Apply to all paths except the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimizer)
    // - favicon and public assets (common extensions)
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
  ],
};
