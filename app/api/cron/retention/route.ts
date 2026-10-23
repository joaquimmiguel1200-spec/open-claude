import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')

  // Fail closed: a missing secret must never make this maintenance endpoint public.
  if (!secret || authorization !== `Bearer ${secret}`) return unauthorized()

  try {
    const admin = createSupabaseAdminClient()
    const authAttemptsCutoff = new Date(Date.now() - 90 * DAY_MS).toISOString()
    const retentionCutoff = new Date(Date.now() - 180 * DAY_MS).toISOString()

    // Perform each operation explicitly and check every result. The old implementation
    // ignored the RPC result and could report success even when the database routine failed.
    const authAttempts = await admin
      .from('auth_attempts')
      .delete({ count: 'exact' })
      .lt('created_at', authAttemptsCutoff)
      .select('id')
    if (authAttempts.error) throw new Error('auth_attempts cleanup failed')

    const securityEvents = await admin
      .from('security_events')
      .delete({ count: 'exact' })
      .lt('created_at', retentionCutoff)
      .select('id')
    if (securityEvents.error) throw new Error('security_events cleanup failed')

    const auditLogs = await admin
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', retentionCutoff)
      .select('id')
    if (auditLogs.error) throw new Error('audit_logs cleanup failed')

    const suspensions = await admin
      .from('account_suspensions')
      .update({ active: false })
      .eq('active', true)
      .not('ends_at', 'is', null)
      .lt('ends_at', new Date().toISOString())
      .select('id')
    if (suspensions.error) throw new Error('account_suspensions cleanup failed')

    return NextResponse.json({
      ok: true,
      cutoffs: { authAttempts: authAttemptsCutoff, auditAndSecurity: retentionCutoff },
      counts: {
        authAttempts: authAttempts.count ?? authAttempts.data?.length ?? 0,
        securityEvents: securityEvents.count ?? securityEvents.data?.length ?? 0,
        auditLogs: auditLogs.count ?? auditLogs.data?.length ?? 0,
        suspensionsDeactivated: suspensions.data?.length ?? 0,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    // Log only a short, non-secret diagnostic. Never return database internals to callers.
    console.error('[retention] cleanup failed', {
      reason: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
    })
    return NextResponse.json(
      { ok: false, error: 'Retention cleanup failed. Check server logs and required credentials.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
