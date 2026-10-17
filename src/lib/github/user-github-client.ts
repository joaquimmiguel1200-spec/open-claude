import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from '@/lib/security/encryption'
import { createGitHubClient } from './github-client'

export async function createGitHubClientForUser(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from('github_connections').select('access_token_ref').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error('Não foi possível consultar a conexão GitHub.')
  if (data?.access_token_ref) {
    let token = ''
    try { token = decryptSecret(data.access_token_ref) } catch { throw new Error('A credencial GitHub não pode ser descriptografada. Reconecte sua conta.') }
    return createGitHubClient({ token, baseUrl: process.env.GITHUB_API_URL })
  }
  if (process.env.GITHUB_TOKEN) return createGitHubClient({ token: process.env.GITHUB_TOKEN, baseUrl: process.env.GITHUB_API_URL })
  throw new Error('GitHub não conectado. Abra Configurações → GitHub e conecte um token pessoal.')
}
