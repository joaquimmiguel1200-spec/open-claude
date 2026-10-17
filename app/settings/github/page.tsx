'use client'
import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

type Connection = { connected: boolean; accountLogin: string | null; scopes: string[]; connectedAt: string | null }

export default function GitHubSettingsPage() {
  const [connection, setConnection] = useState<Connection>({ connected: false, accountLogin: null, scopes: [], connectedAt: null })
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/github/connection', { cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar a conexão.')
      setConnection(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível consultar a conexão.')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function connect(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/github/connection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Não foi possível conectar.')
      setToken(''); setConnection({ connected: true, accountLogin: data.accountLogin, scopes: data.scopes ?? [], connectedAt: new Date().toISOString() })
      setMessage('GitHub conectado. O token foi validado e armazenado criptografado no servidor.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível conectar.') }
    finally { setBusy(false) }
  }

  async function disconnect() {
    setBusy(true); setError(''); setMessage('')
    try {
      const response = await fetch('/api/github/connection', { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Não foi possível desconectar.')
      setConnection({ connected: false, accountLogin: null, scopes: [], connectedAt: null })
      setMessage('GitHub desconectado deste workspace. Revogue o token também nas configurações do GitHub se não for mais usá-lo.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível desconectar.') }
    finally { setBusy(false) }
  }

  return <main className="shell"><nav className="nav"><Link className="brand" href="/chat">OPEN CLAUDE</Link><Link className="muted" href="/settings">APIs / Skills</Link><Link className="muted" href="/chat">Voltar ao chat</Link></nav><section className="chat"><article className="card"><p className="kicker">INTEGRAÇÕES · CREDENCIAIS</p><h1>Conectar GitHub</h1><p className="muted">O Code precisa de acesso ao repositório para ler arquivos, executar testes em sandbox e propor alterações. A conexão é individual por usuário.</p>
  {loading ? <p className="muted">Verificando conexão…</p> : connection.connected ? <><p>Conectado como <strong>@{connection.accountLogin}</strong>.</p><p className="muted">Token armazenado criptografado. Ele não é exibido novamente nem enviado ao navegador após salvar.</p><button className="button secondary" disabled={busy} onClick={disconnect}>Desconectar GitHub</button></> : <form onSubmit={connect} style={{display:'grid',gap:12}}><label>Token pessoal do GitHub<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="github_pat_…" minLength={20} maxLength={500} required/></label><p className="muted">Crie um token com acesso somente aos repositórios necessários e permissões mínimas: Metadata (read) e Contents (read/write). Evite conceder permissões administrativas.</p><p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Criar token pessoal no GitHub ↗</a></p><button className="button" disabled={busy||token.trim().length<20}>{busy?'Validando…':'Validar e conectar'}</button></form>}
  {error&&<p role="alert" style={{color:'#ff8a8a'}}>{error}</p>}{message&&<p role="status">{message}</p>}
  <p className="muted" style={{marginTop:18,fontSize:12}}>O token é validado pela API do GitHub e criptografado com AES-256-GCM no servidor. A conexão exige APP_ENCRYPTION_KEY configurada. Desconectar remove a cópia armazenada, mas não revoga o token no GitHub.</p>
</article></section></main>
}
