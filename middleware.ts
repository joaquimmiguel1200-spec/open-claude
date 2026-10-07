import { NextResponse, type NextRequest } from 'next/server'

/**
 * Keep middleware edge-fast. Authentication is enforced by server/API handlers
 * with requireUser(). Middleware must never wait on Supabase/network I/O because
 * a stalled auth request can make the entire page hit Vercel's initial-response timeout.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const isProduction = process.env.NODE_ENV === 'production'
  const proto = request.headers.get('x-forwarded-proto')

  if (isProduction && proto && proto !== 'https') {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    return NextResponse.redirect(url)
  }

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  if (isProduction) response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
