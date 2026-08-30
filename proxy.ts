import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const developmentStudioPreview = process.env.NODE_ENV === 'development'
    && (request.nextUrl.pathname === '/auth/design-studio-preview'
      || (request.nextUrl.pathname.startsWith('/api/mi-marca/template-html/')
        && request.headers.get('referer')?.includes('/auth/design-studio-preview')))
  if (developmentStudioPreview) {
    return NextResponse.next()
  }
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
