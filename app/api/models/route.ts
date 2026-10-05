import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { userAIProviders } from '@/lib/ai/user-providers'
import { rankModels } from '@/lib/ai/provider-registry'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const providers = await userAIProviders(supabase, user.id)
    const models = rankModels(providers, 'auto').map((model) => ({
      id: model.id,
      provider: model.provider,
      displayName: model.displayName ?? model.id,
      free: Boolean(model.free),
      enabled: model.enabled !== false,
      contextWindow: model.contextWindow ?? null,
      supportsVision: Boolean(model.supportsVision),
      supportsTools: Boolean(model.supportsTools),
    }))
    const url = new URL(request.url)
    const requested = url.searchParams.get('model')?.trim()
    return NextResponse.json({
      models,
      selected: requested && models.some((model) => model.id === requested) ? requested : models[0]?.id ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar os modelos.'
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível carregar os modelos.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
