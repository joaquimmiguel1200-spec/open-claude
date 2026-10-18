import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

function safePath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/chat'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = safePath(url.searchParams.get('next'))

  const supabase = await createSupabaseServerClient()
  let error: { message: string } | null = null

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    error = result.error
  } else {
    return NextResponse.redirect(new URL('/login?error=confirmation', url.origin))
  }

  if (error) {
    return NextResponse.redirect(new URL('/login?error=confirmation', url.origin))
  }

  const completion = new URL('/auth/complete', url.origin)
  completion.searchParams.set('next', next)
  return NextResponse.redirect(completion)
}
