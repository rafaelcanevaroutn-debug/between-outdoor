import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // The preview route performs its own authentication (signed-in user or
  // PREVIEW_DEV_TOKEN). Let it reach the route handler so local copy audits
  // are not redirected to the login page by the global session middleware.
  if (request.nextUrl.pathname === '/api/generate/preview') {
    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
