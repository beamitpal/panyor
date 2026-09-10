import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

/**
 * Edge-safe first line of defense: if a request targets a protected route
 * and carries no Better Auth session cookie at all, redirect to /login.
 *
 * This is intentionally coarse — cookie presence is not proof of a valid
 * session. Every protected Server Component / Route Handler must still call
 * requireAuth()/requirePermission() from lib/auth/server.ts, which validates
 * the session against PostgreSQL and enforces role + account status.
 */
const PROTECTED_PREFIXES = ["/admin"]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtected(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
