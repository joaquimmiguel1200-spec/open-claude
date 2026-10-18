'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Server = { id: string; name: string; url: string; status: string }
type Tool = { name: string; description: string; inputSchema: { properties?: Record<string, { type?: string; description?: string }>; required?: string[] }; annotations?: { readOnlyHint?: boolean } }

export default function McpPage() {
  const [servers, setServers] = useState<Server[]>([])
  const [selected, setSelected] = useState('')
  const [tools, setTools] = useState<Tool[]>([])
  const [chosen, setChosen] = useState<Tool | null>(null)
  const [args, setArgs] = useState('{}')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)

  async function refresh() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/mcp', { cache: 'no-store' })
      const data = await response.json()
      if (response.status === 401) { window.location.href = '/login'; return }
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as conexões.')
      setServers(data.servers || []); setSetupRequired(Boolean(data.setupRequired))
      if (data.servers?.length) await loadTools(data.servers[0].id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar MCP.') }
    finally { setLoading(false) }
  }
  async function loadTools(id: string) {
    setSelected(id); setTools([]); setChosen(null); setResult(''); setError('')
    try {
      const response = await fetch('/api/mcp?server=' + encodeURIComponent(id), { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível listar ferramentas.')
      setTools(data.tools || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao listar ferramentas.') }
  }
  useEffect(() => { void refresh() }, [])
  async function runTool() {
    if (!chosen) return
    setBusy(true); setError(''); setResult('')
    try {
      const parsed = JSON.parse(args)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Os argumentos precisam ser um objeto JSON.')
      const response = await fetch('/api/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ server: selected, tool: chosen.name, arguments: parsed }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'A ferramenta não foi executada.')
      setResult(JSON.stringify(data.result, null, 2))
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao executar ferramenta.') }
    finally { setBusy(false) }
  }

  return <main className="shell" style={{ maxWidth: 1100, paddingTop: 32 }}>
    <nav className="nav"><Link href="/chat" className="brand">Open Claude <span className="accent">/ MCP</span></Link><Link href="/chat" className="button secondary compact">← Voltar ao workspace</Link></nav>
    <section className="card" style={{ marginTop: 28 }}>
      <p className="eyebrow">Conectividade extensível</p><h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', letterSpacing: '-.06em', margin: '8px 0' }}>MCP & Conexões</h1>
      <p className="muted" style={{ lineHeight: 1.7, maxWidth: 760 }}>Conecte servidores Model Context Protocol configurados pelo administrador. Credenciais permanecem no servidor; ferramentas sem indicação explícita de somente leitura ficam bloqueadas nesta versão inicial.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '20px 0' }}><span className="button secondary compact">JSON-RPC 2.0</span><span className="button secondary compact">Streamable HTTP</span><span className="button secondary compact">Timeout 12 s</span><button className="button compact" onClick={() => void refresh()} disabled={loading}>{loading ? 'Atualizando…' : 'Atualizar conexões'}</button></div>
      {error && <p role="alert" style={{ color: '#ff8c9b', whiteSpace: 'pre-wrap' }}>{error}</p>}
      {loading ? <p className="muted">Carregando servidores configurados…</p> : setupRequired ? <div style={{ padding: 20, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--surface-2)' }}><h2>Configure seu primeiro servidor</h2><p className="muted">Adicione a variável de ambiente <code>MCP_SERVERS_JSON</code> na Vercel. Exemplo de configuração está no README e em <code>.env.example</code>. Depois, faça um novo deploy.</p><p className="muted">Nenhum servidor é adicionado automaticamente: cada conector precisa ser avaliado, configurado e autorizado.</p><p style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}><a href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp" target="_blank" rel="noreferrer" className="accent">Conectores remotos no Claude ↗</a><a href="https://modelcontextprotocol.io/" target="_blank" rel="noreferrer" className="accent">Especificação MCP ↗</a><a href="https://github.com/modelcontextprotocol/servers" target="_blank" rel="noreferrer" className="accent">Servidores de referência ↗</a></p></div> : <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, .75fr) minmax(0, 1.5fr)', gap: 18 }}>
        <aside style={{ display: 'grid', alignContent: 'start', gap: 8 }}>{servers.map(server => <button key={server.id} className={'button ' + (selected === server.id ? '' : 'secondary')} onClick={() => void loadTools(server.id)} style={{ justifyContent: 'flex-start', textAlign: 'left' }}>{server.name}</button>)}</aside>
        <div><h2 style={{ marginTop: 0 }}>Ferramentas disponíveis</h2>{tools.length === 0 ? <p className="muted">Nenhuma ferramenta encontrada ou o servidor ainda não respondeu.</p> : <div style={{ display: 'grid', gap: 8 }}>{tools.map(tool => <button key={tool.name} className={'button ' + (chosen?.name === tool.name ? '' : 'secondary')} onClick={() => { setChosen(tool); setArgs(JSON.stringify(Object.fromEntries(Object.entries(tool.inputSchema?.properties || {}).filter(([key]) => (tool.inputSchema?.required || []).includes(key)).map(([key, value]) => [key, value.type === 'string' ? '' : value.type === 'boolean' ? false : value.type === 'array' ? [] : value.type === 'object' ? {} : null])), null, 2)); setResult('') }} style={{ display: 'block', textAlign: 'left', padding: 14 }}><strong>{tool.name}</strong><div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{tool.description || 'Sem descrição'} · {tool.annotations?.readOnlyHint === true ? 'Somente leitura' : 'Execução bloqueada se tiver efeitos colaterais'}</div></button>)}</div>}
          {chosen && <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 18 }}><h3>{chosen.name}</h3><label className="muted" htmlFor="mcp-args">Argumentos JSON</label><textarea id="mcp-args" value={args} onChange={e => setArgs(e.target.value)} rows={7} spellCheck={false} style={{ width: '100%', marginTop: 8, padding: 12, color: 'var(--text)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, fontFamily: 'monospace' }} /><button className="button" onClick={() => void runTool()} disabled={busy || chosen.annotations?.readOnlyHint !== true} style={{ marginTop: 10 }}>{busy ? 'Executando…' : 'Executar ferramenta somente leitura'}</button>{chosen.annotations?.readOnlyHint !== true && <p className="muted">Bloqueado por segurança: a ferramenta não declarou readOnlyHint=true.</p>}</div>}
          {result && <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: 'var(--surface-2)', padding: 16, borderRadius: 12, maxHeight: 420, overflow: 'auto' }}>{result}</pre>}
        </div>
      </div>}
    </section>
    <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>MCP é um protocolo de integração, não uma lista única de servidores oficiais da Anthropic. Revise o fornecedor e as permissões de cada servidor antes de habilitá-lo.</p>
  </main>
}
