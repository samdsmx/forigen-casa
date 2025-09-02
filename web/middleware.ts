import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // Refresca cookies de sesión en cada request (clave para estabilidad en prod)
  const { data: { session } } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const isLogin = pathname.startsWith("/login");

  if (!session && !isLogin) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    // Preserva cookies/headers que pudo haber seteado Supabase
    const redirectRes = NextResponse.redirect(loginUrl);
    // Copia headers (incluidas Set-Cookie) del res original
    res.headers.forEach((value, key) => redirectRes.headers.set(key, value));
    return redirectRes;
  }

  if (session && isLogin) {
    const homeRes = NextResponse.redirect(new URL("/", req.url));
    res.headers.forEach((value, key) => homeRes.headers.set(key, value));
    return homeRes;
  }

  return res;
}

export const config = {
  matcher: [
    // Excluir estáticos y API; proteger todo lo demás
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
};
