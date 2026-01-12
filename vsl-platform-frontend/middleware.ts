import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to restrict admin access to only /admin routes
 * Note: This runs on the server, so we can't access localStorage directly.
 * We'll rely on cookies or headers for token-based auth in the future.
 * For now, client-side checks in layouts handle the redirect.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/api",
    "/_next",
    "/favicon.ico",
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For now, let client-side layouts handle admin/user restrictions
  // This middleware can be extended later to check cookies/headers for token
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

