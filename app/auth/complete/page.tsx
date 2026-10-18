'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const policyTypes = ['terms', 'privacy', 'security', 'cookies', 'acceptable_use', 'ai'] as const
const policyLinks: Record<string, string> = { terms: '/terms', privacy: '/privacy', security: '/security', cookies: '/cookies', acceptable_use: '/acceptable-use', ai: '/ai-policy' }
const policyLabels: Record<string, string> = { terms: 'Termos de Uso', privacy: 'Política de Privacidade', security: 'Política de Segurança', cookies: 'Política de Cookies', acceptable_use: 'Uso aceitável', ai: 'Política de uso de IA' }

function safePath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/chat'
}

export default function AuthCompletePage() {
  const [next, setNext] = useState('/chat')
  const [accepted, setAccepted] = useState(false)
  const [required, setRequired] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNext(safePath(params.get('next')))
    ;(async () => {
      try {
        const response = await fetch('/api/policy-acceptance', { cache: 'no-store' })
        if (response.status === 401) { window.location.href = '/login'; return }
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Não foi possível verificar os aceites.')
        const missing = policyTypes.filter(type => !(data.accepted || []).some((entry: any) => entry.policy_type === type && entry.version === data.versions?.[type]))
        if (missing.length === 0) {
          localStorage.removeItem('open-claude-policies-pending')
          window.location.replace(safePath(params.get('next')))
          return
        }
        setRequired(missing)
      } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao verificar políticas.') }
      finally { setLoading(false) }
    })()
  }, [])

  async function confirm() {
    if (!accepted) { setError('Marque a caixa para confirmar que leu e aceita as políticas listadas.'); return }
    setSaving(true); setError('')
    try {
      const results = await Promise.all(required.map(policyType => fetch('/api/policy-acceptance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ policyType }) })))
      if (results.some(response => !response.ok)) throw new Error('Não foi possível registrar todos os aceites. Tente novamente.')
      localStorage.removeItem('open-claude-policies-pending')
      window.location.replace(next)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao registrar os aceites.') }
    finally { setSaving(false) }
  }

  return <main className="shell" style={{ maxWidth: 720, paddingTop: 48 }}>
    <section className="card">
      <Link href="/" className="muted">← Open Claude</Link>
      <p className="eyebrow" style={{ marginTop: 26 }}>Proteção da conta</p>
      <h1>Quase pronto</h1>
      {loading ? <p className="muted">Verificando os aceites da sua conta…</p> : required.length === 0 && !error ? <p className="muted">Tudo certo. Redirecionando…</p> : <>
        <p className="muted" style={{ lineHeight: 1.7 }}>Antes de continuar, confirme os documentos que ainda não foram aceitos ou cuja versão foi atualizada.</p>
        <div style={{ display: 'grid', gap: 12, margin: '20px 0' }}>{required.map(type => <Link key={type} href={policyLinks[type]} className="button secondary" style={{ justifyContent: 'space-between' }}>{policyLabels[type]} <span>↗</span></Link>)}</div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.6 }}><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /><span>Li e aceito os documentos listados acima e entendo como o Open Claude trata meus dados e o uso de IA.</span></label>
        {error && <p role="alert" style={{ color: '#ff8c9b' }}>{error}</p>}
        <button className="button" style={{ marginTop: 18, width: '100%' }} onClick={confirm} disabled={saving || loading}>{saving ? 'Registrando…' : 'Confirmar e continuar'}</button>
      </>}
      {error && required.length === 0 && <p role="alert" style={{ color: '#ff8c9b' }}>{error}</p>}
    </section>
  </main>
}
