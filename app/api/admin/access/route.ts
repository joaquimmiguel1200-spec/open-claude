import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
const isAdmin = (user: any) => user?.app_metadata?.role === 'admin'

export async function GET() {
  try {
    const { user, supabase } = await requireUser()
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data, error } = await supabase
      .from('account_access')
      .select('user_id,email,status,requested_at,reviewed_at,review_note')
      .order('requested_at', { ascending: false })
      .limit(250)
    if (error) throw error
    return NextResponse.json({ requests: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'ACCOUNT_PENDING_APPROVAL' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const userId = String(body?.userId ?? '')
    const status = String(body?.status ?? '')
    const note = String(body?.note ?? '').slice(0, 1000)
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid review request' }, { status: 400 })
    }
    const { data, error } = await supabase.from('account_access')
      .update({ status, reviewed_at: status === 'pending' ? null : new Date().toISOString(), reviewed_by: user.id, review_note: note, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('user_id,email,status,reviewed_at')
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'admin.account_access.review',
      resource_type: 'account_access',
      resource_id: userId,
      metadata: { status, note },
    })
    return NextResponse.json({ ok: true, request: data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review failed'
    const status = message === 'UNAUTHENTICATED' ? 401 : message === 'ACCOUNT_PENDING_APPROVAL' ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
