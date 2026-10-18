import { type NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/register", "/invite"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (request.cookies.has("ls_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const next = pathname + request.nextUrl.search;
  url.search = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)$).*)"],
};
