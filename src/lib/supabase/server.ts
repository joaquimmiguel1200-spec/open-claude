import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })) } catch {}
        },
      },
    },
  )
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('UNAUTHENTICATED')
  return { supabase, user: data.user }
}
